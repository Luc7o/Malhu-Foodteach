from datetime import datetime

from flask import Blueprint, request, jsonify

from extensions import db
from models import Locker, PickupCode

locker_device_bp = Blueprint("locker_device", __name__, url_prefix="/api/locker")


@locker_device_bp.post("/validate")
def validate_code():
    """
    Llamado por el ESP32 (no por el usuario) cuando el escáner QR lee un código.

    Body esperado:
    {
      "device_id": "LOCKER-001",   # identifica físicamente al locker/ESP32
      "code": "MLH-A1B2C3D4E5"     # lo que leyó el escáner QR
    }
    """
    data = request.get_json() or {}
    device_id = data.get("device_id")
    code = data.get("code")

    if not device_id or not code:
        return jsonify({"valid": False, "reason": "device_id y code son requeridos"}), 400

    locker = Locker.query.filter_by(device_id=device_id).first()
    if not locker:
        return jsonify({"valid": False, "reason": "Locker no reconocido"}), 404

    pickup = PickupCode.query.filter_by(code=code.strip()).first()

    if not pickup:
        return jsonify({"valid": False, "reason": "Código no encontrado"}), 404

    if pickup.box.locker_id != locker.id:
        return jsonify({"valid": False, "reason": "Este código no pertenece a este locker"}), 403

    if not pickup.is_valid():
        return jsonify({"valid": False, "reason": "Código usado o expirado"}), 410

    # Todo bien: marca como usado, libera la caja y actualiza la orden
    pickup.status = "usado"
    pickup.used_at = datetime.utcnow()
    pickup.box.status = "libre"
    pickup.order.status = "retirado"
    db.session.commit()

    return jsonify({
        "valid": True,
        "box_number": pickup.box.box_number,
    })
