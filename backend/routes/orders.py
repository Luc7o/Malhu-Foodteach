import base64
from io import BytesIO
from datetime import datetime, timedelta

import qrcode
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import Order, OrderItem, Product, Locker, LockerBox, PickupCode

orders_bp = Blueprint("orders", __name__, url_prefix="/api/orders")


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
    if not locker:
        return jsonify({"error": "Locker no encontrado"}), 404

    order = Order(user_id=user_id, locker_id=locker_id, total=0)
    db.session.add(order)
    db.session.flush()

    total = 0
    for item in items:
        product = Product.query.get(item.get("product_id"))
        quantity = int(item.get("quantity", 1))

        if not product or not product.active:
            db.session.rollback()
            return jsonify({"error": f"Producto no disponible: {item.get('product_id')}"}), 400
        if product.stock < quantity:
            db.session.rollback()
            return jsonify({"error": f"Stock insuficiente para {product.name}"}), 400

        subtotal = float(product.price) * quantity
        total += subtotal

        db.session.add(OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=quantity,
            unit_price=product.price,
        ))

    order.total = total
    db.session.commit()

    return jsonify(order.to_dict()), 201


@orders_bp.post("/<order_id>/pay")
@jwt_required()
def pay_order(order_id):
    """
    Simula el pago (aquí es donde en el futuro se conecta una pasarela real).
    Al 'pagar', se asigna una caja libre del locker y se genera el código QR.
    """
    user_id = get_jwt_identity()
    order = Order.query.get_or_404(order_id)

    if order.user_id != user_id:
        return jsonify({"error": "No autorizado"}), 403
    if order.status != "pendiente_pago":
        return jsonify({"error": f"La orden ya está en estado '{order.status}'"}), 400

    # Busca una caja libre en el locker elegido
    free_box = LockerBox.query.filter_by(locker_id=order.locker_id, status="libre").first()
    if not free_box:
        return jsonify({"error": "No hay casilleros libres en ese locker por ahora"}), 409

    # Descuenta stock
    for item in order.items:
        item.product.stock -= item.quantity

    free_box.status = "ocupado"
    order.status = "pagado"

    expiration = datetime.utcnow() + timedelta(
        hours=current_app.config["PICKUP_CODE_EXPIRATION_HOURS"]
    )
    pickup = PickupCode(
        order_id=order.id,
        box_id=free_box.id,
        code=PickupCode.generate_code(),
        expires_at=expiration,
    )
    db.session.add(pickup)
    db.session.commit()

    return jsonify(order.to_dict())


@orders_bp.get("/<order_id>/qr")
@jwt_required()
def get_order_qr(order_id):
    """Devuelve el código QR como imagen PNG codificada en base64."""
    order = Order.query.get_or_404(order_id)
    user_id = get_jwt_identity()

    if order.user_id != user_id:
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
    return jsonify(order.to_dict())
