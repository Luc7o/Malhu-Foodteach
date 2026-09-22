import hmac
from datetime import datetime

from flask import Blueprint, request, jsonify, current_app

from extensions import db
from models import Locker, PickupCode

locker_device_bp = Blueprint("locker_device", __name__, url_prefix="/api/locker")


def _check_device_key(locker):
    """
    Si el locker tiene clave configurada, el ESP32 debe enviarla en la cabecera
    X-Device-Key. Sin clave configurada se acepta la llamada (modo prototipo).
    """
    if not locker.device_key:
        return True
    sent = request.headers.get("X-Device-Key", "")
    return hmac.compare_digest(sent, locker.device_key)


@locker_device_bp.post("/validate")
def validate_code():
    """
    Llamado por el ESP32 (no por el usuario) cuando el escáner QR lee un código.

    Body esperado:
    {
      "device_id": "LOCKER-001",   # identifica físicamente al locker/ESP32
      "code": "MLH-A1B2C3D4E5"     # lo que leyó el escáner QR
    }
    Cabecera (si el locker tiene clave): X-Device-Key: <clave>
    """
    data = request.get_json() or {}
    device_id = data.get("device_id")
    code = data.get("code")

    if not device_id or not code:
        return jsonify({"valid": False, "reason": "device_id y code son requeridos"}), 400

    locker = Locker.query.filter_by(device_id=device_id).first()
    if not locker:
        return jsonify({"valid": False, "reason": "Locker no reconocido"}), 404

    if not _check_device_key(locker):
        return jsonify({"valid": False, "reason": "Clave de dispositivo inválida"}), 401

    locker.last_seen = datetime.utcnow()

    pickup = PickupCode.query.filter_by(code=str(code).strip()).first()

    if not pickup:
        db.session.commit()
        return jsonify({"valid": False, "reason": "Código no encontrado"}), 404

    if pickup.box.locker_id != locker.id:
        db.session.commit()
        return jsonify({"valid": False, "reason": "Este código no pertenece a este locker"}), 403

    if not pickup.is_valid():
        db.session.commit()
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
        "open_seconds": current_app.config["DEVICE_OPEN_SECONDS"],
    })


@locker_device_bp.post("/heartbeat")
def heartbeat():
    """
    Señal periódica del ESP32 (por ejemplo cada 30 s) para que el panel de
    administración muestre si el locker está en línea.
    Body: {"device_id": "LOCKER-001"}  ·  Cabecera: X-Device-Key (si aplica)
    """
    data = request.get_json() or {}
    device_id = data.get("device_id")
    if not device_id:
        return jsonify({"ok": False, "reason": "device_id es requerido"}), 400

    locker = Locker.query.filter_by(device_id=device_id).first()
    if not locker:
        return jsonify({"ok": False, "reason": "Locker no reconocido"}), 404
    if not _check_device_key(locker):
        return jsonify({"ok": False, "reason": "Clave de dispositivo inválida"}), 401

    locker.last_seen = datetime.utcnow()
    db.session.commit()
    return jsonify({"ok": True, "server_time": datetime.utcnow().isoformat() + "Z"})
