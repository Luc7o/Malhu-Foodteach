"""
Pagos con Izipay (formulario incrustado).

1. POST /api/orders/<id>/izipay/form-token  -> el navegador pide el formToken para mostrar el formulario.
2. El cliente paga dentro del formulario (los datos de la tarjeta nunca pasan por este servidor).
3. POST /api/orders/<id>/izipay/validate    -> el navegador envía kr-answer/kr-hash; se valida la firma
                                               con la clave HMAC-SHA-256 y se confirma el pedido.
4. POST /api/izipay/ipn                     -> Izipay avisa de servidor a servidor (firma con la clave
                                               PASSWORD). Respaldo por si el cliente cierra la ventana.
"""
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from extensions import db
from models import LockerBox, Order, User
from payments import IzipayProvider, PaymentError, check_hash, get_provider, parse_answer
from services import settle_izipay_payment, stock_problem

izipay_bp = Blueprint("izipay", __name__, url_prefix="/api")


def _provider():
    if current_app.config["PAYMENT_PROVIDER"] != "izipay":
        raise PaymentError("El pago con Izipay no está activado (PAYMENT_PROVIDER=izipay).")
    return get_provider("izipay", current_app.config)


@izipay_bp.post("/orders/<order_id>/izipay/form-token")
@jwt_required()
def form_token(order_id):
    order = Order.query.get_or_404(order_id)
    if order.user_id != get_jwt_identity():
        return jsonify({"error": "No autorizado"}), 403
    if order.status != "pendiente_pago":
        return jsonify({"error": f"La orden ya está en estado '{order.status}'"}), 400

    # Antes de cobrar, confirma que todavía hay stock y una caja libre
    problem, _ = stock_problem(order)
    if problem:
        return jsonify({"error": problem}), 409
    if not LockerBox.query.filter_by(locker_id=order.locker_id, status="libre").first():
        return jsonify({"error": "No hay casilleros libres en ese locker por ahora"}), 409

    try:
        provider = _provider()
        token = provider.create_form_token(order, User.query.get(order.user_id))
    except PaymentError as e:
        return jsonify({"error": str(e)}), 502
    return jsonify({"formToken": token, **provider.public_info()})


def _result_response(result, order):
    if result in ("paid", "already_paid"):
        return jsonify(order.to_dict())
    if result == "unpaid":
        return jsonify({"error": "El pago no fue aprobado. Puedes intentarlo de nuevo."}), 402
    if result == "refund":
        return jsonify({
            "error": "Recibimos tu pago, pero ya no había stock o cajas libres. "
                     "Te lo devolveremos; te contactaremos pronto."
        }), 409
    return jsonify({"error": "No pudimos confirmar el pago. Si te cobraron, escríbenos."}), 400


@izipay_bp.post("/orders/<order_id>/izipay/validate")
@jwt_required()
def validate(order_id):
    order = Order.query.get_or_404(order_id)
    if order.user_id != get_jwt_identity():
        return jsonify({"error": "No autorizado"}), 403
    data = request.get_json(silent=True) or {}
    raw_answer, kr_hash = data.get("kr_answer"), data.get("kr_hash")

    try:
        provider = _provider()
    except PaymentError as e:
        return jsonify({"error": str(e)}), 400
    if not check_hash(raw_answer, kr_hash, provider.hmac_key):
        return jsonify({"error": "Firma de pago inválida"}), 400

    parsed = parse_answer(raw_answer)
    if parsed["order_id"] != order.id:
        return jsonify({"error": "El pago no corresponde a este pedido"}), 400
    result, order = settle_izipay_payment(order.id, parsed)
    return _result_response(result, order)


@izipay_bp.post("/izipay/ipn")
def ipn():
    """Notificación de servidor a servidor. Responde 200 cuando la procesó."""
    raw_answer, kr_hash = request.form.get("kr-answer"), request.form.get("kr-hash")
    try:
        provider = _provider()
    except PaymentError:
        return "Izipay no está activado", 400
    if not check_hash(raw_answer, kr_hash, provider.password):
        return "Firma inválida", 400

    parsed = parse_answer(raw_answer)
    result, _order = settle_izipay_payment(parsed["order_id"], parsed)
    return f"OK {result}", 200
