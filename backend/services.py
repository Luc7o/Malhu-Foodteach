"""Lógica de negocio compartida entre las rutas."""
from datetime import datetime, timedelta

from flask import current_app

from extensions import db
from models import Order, PickupCode


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
