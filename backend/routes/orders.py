import base64
from io import BytesIO
from datetime import datetime, timedelta

import qrcode
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from extensions import db
from models import Order, OrderItem, Product, Locker, LockerBox, PickupCode
from payments import get_provider, PaymentError
from customization import SelectionError, dumps_selection, nutrition_totals, resolve_selection
from services import FulfillmentError, fulfill_paid_order, stock_problem

orders_bp = Blueprint("orders", __name__, url_prefix="/api/orders")


def _can_view(order):
    return order.user_id == get_jwt_identity() or get_jwt().get("role") == "admin"


@orders_bp.post("")
@jwt_required()
def create_order():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    items = data.get("items", [])
    locker_id = data.get("locker_id")

    if not items or not locker_id:
        return jsonify({"error": "items y locker_id son requeridos"}), 400

    locker = Locker.query.get(locker_id)
    if not locker or not locker.active:
        return jsonify({"error": "Locker no disponible"}), 404
    if not any(b.status == "libre" for b in locker.boxes):
        return jsonify({"error": "No hay casilleros libres en ese locker por ahora"}), 409

    # Cada línea es un plato + las opciones que eligió el cliente. Dos líneas iguales se unen.
    lines = {}
    for item in items:
        try:
            quantity = int(item.get("quantity", 1))
        except (TypeError, ValueError):
            return jsonify({"error": "La cantidad debe ser un número entero"}), 400
        if quantity < 1:
            return jsonify({"error": "La cantidad debe ser al menos 1"}), 400
        pid = item.get("product_id")
        option_ids = item.get("option_ids") or []
        if not isinstance(option_ids, list):
            return jsonify({"error": "option_ids debe ser una lista"}), 400
        key = (pid, tuple(sorted(set(str(i) for i in option_ids))))
        if key in lines:
            lines[key]["quantity"] += quantity
        else:
            lines[key] = {"product_id": pid, "option_ids": list(key[1]), "quantity": quantity}

    built = []  # (producto, cantidad, extra, snapshot, calorías)
    for line in lines.values():
        product = Product.query.get(line["product_id"]) if line["product_id"] else None
        if not product or not product.active or product.ingredient_only:
            return jsonify({"error": "Uno de los productos ya no está disponible"}), 400
        try:
            chosen, extra, snapshot = resolve_selection(product, line["option_ids"])
        except SelectionError as e:
            return jsonify({"error": str(e)}), 400
        totals = nutrition_totals(product, [o.ingredient for o in chosen])
        built.append((product, line["quantity"], extra, snapshot, totals["calories"] if totals else None))

    # Stock: el plato y cada ingrediente elegido (sumando todas las líneas del pedido)
    demand = {}
    for product, quantity, _extra, snapshot, _cal in built:
        demand[product.id] = demand.get(product.id, 0) + quantity
        for opt in snapshot:
            demand[opt["product_id"]] = demand.get(opt["product_id"], 0) + quantity
    for pid, quantity in demand.items():
        product = Product.query.get(pid)
        if not product or product.sold_out or product.stock < quantity:
            return jsonify({"error": f"Stock insuficiente para {product.name if product else 'un producto'}"}), 400

    order = Order(user_id=user_id, locker_id=locker_id, total=0)
    db.session.add(order)
    db.session.flush()

    total = 0
    for product, quantity, extra, snapshot, calories in built:
        unit_price = round(float(product.price) + extra, 2)
        total += unit_price * quantity
        db.session.add(OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=quantity,
            unit_price=unit_price,
            selections=dumps_selection(snapshot),
            calories=calories,
        ))

    order.total = round(total, 2)
    db.session.commit()

    return jsonify(order.to_dict()), 201


@orders_bp.post("/<order_id>/pay")
@jwt_required()
def pay_order(order_id):
    """
    Cobra el pedido con el proveedor configurado (hoy: pago simulado).
    Al pagar se asigna una caja libre del locker y se genera el código QR.
    Body opcional: {"method": "tarjeta" | "yape" | "plin"}
    """
    user_id = get_jwt_identity()
    order = Order.query.get_or_404(order_id)

    if order.user_id != user_id:
        return jsonify({"error": "No autorizado"}), 403
    if order.status != "pendiente_pago":
        return jsonify({"error": f"La orden ya está en estado '{order.status}'"}), 400

    method = (request.get_json(silent=True) or {}).get("method", "tarjeta")

    # Vuelve a comprobar el stock: pudo cambiar desde que se creó el pedido
    problem, _ = stock_problem(order, lock=True)
    if problem:
        return jsonify({"error": problem}), 409

    # Busca una caja libre (con bloqueo de fila para no asignar la misma caja dos veces)
    free_box = (
        LockerBox.query.filter_by(locker_id=order.locker_id, status="libre")
        .order_by(LockerBox.box_number)
        .with_for_update()
        .first()
    )
    if not free_box:
        return jsonify({"error": "No hay casilleros libres en ese locker por ahora"}), 409

    try:
        provider = get_provider(current_app.config["PAYMENT_PROVIDER"], current_app.config)
        payment = provider.charge(order, method)
    except PaymentError as e:
        return jsonify({"error": str(e)}), 400

    try:
        fulfill_paid_order(order, payment["method"], payment["ref"])
    except FulfillmentError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 409
    db.session.commit()

    from notifications import check_alerts, notify_order_paid
    notify_order_paid(order)
    check_alerts()

    return jsonify(order.to_dict())


@orders_bp.post("/<order_id>/cancel")
@jwt_required()
def cancel_order(order_id):
    """El cliente puede cancelar un pedido que aún no pagó."""
    order = Order.query.get_or_404(order_id)
    if order.user_id != get_jwt_identity():
        return jsonify({"error": "No autorizado"}), 403
    if order.status != "pendiente_pago":
        return jsonify({"error": "Solo se pueden cancelar pedidos pendientes de pago"}), 400

    order.status = "cancelado"
    db.session.commit()
    return jsonify(order.to_dict())


@orders_bp.get("/<order_id>/qr")
@jwt_required()
def get_order_qr(order_id):
    """Devuelve el código QR como imagen PNG codificada en base64."""
    order = Order.query.get_or_404(order_id)

    if order.user_id != get_jwt_identity():
        return jsonify({"error": "No autorizado"}), 403
    if not order.pickup_code:
        return jsonify({"error": "Esta orden aún no tiene código generado"}), 400

    img = qrcode.make(order.pickup_code.code)
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return jsonify({
        "code": order.pickup_code.code,
        "qr_image_base64": f"data:image/png;base64,{encoded}",
    })


@orders_bp.get("/my")
@jwt_required()
def my_orders():
    user_id = get_jwt_identity()
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@orders_bp.get("/<order_id>")
@jwt_required()
def get_order(order_id):
    order = Order.query.get_or_404(order_id)
    if not _can_view(order):
        return jsonify({"error": "No autorizado"}), 403
    return jsonify(order.to_dict())
