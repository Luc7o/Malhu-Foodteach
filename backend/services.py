"""Lógica de negocio compartida entre las rutas."""
from datetime import datetime, timedelta

from flask import current_app

from extensions import db
from models import LockerBox, Order, PickupCode, Product


def expire_stale(now=None):
    """
    Mantiene los pedidos al día:
    - Código de retiro vencido  -> código 'expirado', pedido 'expirado' y la caja pasa a
      'mantenimiento' (la comida sigue adentro: un admin debe vaciarla y liberarla).
    - Pedido sin pagar por más de PENDING_ORDER_TTL_MINUTES -> 'cancelado'.
    Devuelve cuántos registros cambió.
    """
    now = now or datetime.utcnow()
    changed = 0

    stale_codes = PickupCode.query.filter(
        PickupCode.status == "activo", PickupCode.expires_at < now
    ).all()
    for pickup in stale_codes:
        pickup.status = "expirado"
        if pickup.box and pickup.box.status == "ocupado":
            pickup.box.status = "mantenimiento"
        if pickup.order.status == "pagado":
            pickup.order.status = "expirado"
        changed += 1

    ttl = current_app.config["PENDING_ORDER_TTL_MINUTES"]
    cutoff = now - timedelta(minutes=ttl)
    pending = Order.query.filter(
        Order.status == "pendiente_pago", Order.created_at < cutoff
    ).all()
    for order in pending:
        order.status = "cancelado"
        changed += 1

    if changed:
        db.session.commit()
    return changed


def cancel_paid_order(order):
    """
    Cancela un pedido ya pagado (acción de administrador): devuelve el stock,
    invalida el código y libera la caja para que se pueda volver a usar.
    """
    for item in order.items:
        if item.product:
            item.product.stock += item.quantity
    pickup = order.pickup_code
    if pickup:
        if pickup.status == "activo":
            pickup.status = "expirado"
        if pickup.box and pickup.box.status == "ocupado":
            pickup.box.status = "libre"
    order.status = "cancelado"


class FulfillmentError(Exception):
    pass


def fulfill_paid_order(order, method, ref):
    """
    Deja el pedido como pagado: descuenta stock, asigna una caja libre y crea el código
    de retiro. No hace commit (lo hace quien llama). Lanza FulfillmentError si ya no hay
    stock o cajas libres.
    """
    products = []
    for item in order.items:
        product = Product.query.filter_by(id=item.product_id).with_for_update().first()
        if not product or not product.active or product.sold_out or product.stock < item.quantity:
            name = product.name if product else "un producto"
            raise FulfillmentError(f"Ya no hay stock suficiente de {name}")
        products.append((product, item.quantity))

    box = (
        LockerBox.query.filter_by(locker_id=order.locker_id, status="libre")
        .order_by(LockerBox.box_number)
        .with_for_update()
        .first()
    )
    if not box:
        raise FulfillmentError("No hay casilleros libres en ese locker por ahora")

    for product, quantity in products:
        product.stock -= quantity
    box.status = "ocupado"
    order.status = "pagado"
    order.paid_at = datetime.utcnow()
    order.payment_method = method
    order.payment_ref = ref
    db.session.add(PickupCode(
        order_id=order.id,
        box_id=box.id,
        code=PickupCode.generate_code(),
        expires_at=datetime.utcnow() + timedelta(hours=current_app.config["PICKUP_CODE_EXPIRATION_HOURS"]),
    ))


def settle_izipay_payment(order_id, parsed):
    """
    Procesa un pago de Izipay ya verificado (firma válida). Se llama desde el navegador
    (validate) y desde la IPN; es seguro que lleguen las dos: el pedido se cobra una vez.
    Devuelve (resultado, pedido): 'paid' | 'already_paid' | 'unpaid' | 'mismatch' | 'refund'
    | 'unknown'.
    """
    from notifications import alert_admin, check_alerts, notify_order_paid, notify_refund_needed

    order = Order.query.filter_by(id=order_id).with_for_update().first()
    if not order:
        return "unknown", None
    if order.status == "pagado" or order.status == "retirado":
        return "already_paid", order
    if not parsed["paid"]:
        return "unpaid", order

    expected = int(round(float(order.total) * 100))
    if parsed["amount_cents"] != expected or parsed["currency"] != "PEN":
        alert_admin(
            "Pago de Izipay con monto distinto",
            f"Pedido {order.id}: se esperaba {expected} céntimos PEN y llegó "
            f"{parsed['amount_cents']} {parsed['currency']}. Transacción: {parsed['transaction_uuid']}.",
        )
        return "mismatch", order

    ref = parsed["transaction_uuid"] or "IZIPAY"
    try:
        # También acepta un pedido que se canceló por tiempo mientras el cliente pagaba.
        fulfill_paid_order(order, parsed["method"], ref)
    except FulfillmentError as e:
        db.session.rollback()
        order = Order.query.get(order_id)
        order.status = "cancelado"
        order.payment_method = parsed["method"]
        order.payment_ref = ref
        db.session.commit()
        notify_refund_needed(order, str(e))
        return "refund", order

    db.session.commit()
    notify_order_paid(order)
    check_alerts()
    return "paid", order
