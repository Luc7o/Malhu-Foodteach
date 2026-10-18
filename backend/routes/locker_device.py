import hmac
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, current_app

from extensions import db
from models import AdminKey, Locker, LockerEvent, OpenCommand, PickupCode

locker_device_bp = Blueprint("locker_device", __name__, url_prefix="/api/locker")

ADMIN_PREFIX = "MLH-ADM-"

# Eventos que el ESP32 puede reportar en POST /api/locker/event
DEVICE_EVENTS = {"arranque", "puerta_abierta", "puerta_cerrada", "sin_apertura", "puerta_forzada"}


def _check_device_key(locker):
    """
    Si el locker tiene clave configurada, el ESP32 debe enviarla en la cabecera
    X-Device-Key. Sin clave configurada se acepta la llamada (modo prototipo).
    """
    if not locker.device_key:
        return True
    sent = request.headers.get("X-Device-Key", "")
    return hmac.compare_digest(sent, locker.device_key)


def _log(locker, kind, box_number=None, detail=None):
    """Agrega una línea a la bitácora del locker (el commit lo hace quien llama)."""
    db.session.add(LockerEvent(
        locker_id=locker.id,
        kind=kind,
        box_number=box_number,
        detail=(detail or "")[:200] or None,
    ))


def _reject(locker, reason, status, code=None):
    _log(locker, "rechazado", detail=f"{reason} ({str(code)[:30]})" if code else reason)
    db.session.commit()
    return jsonify({"valid": False, "reason": reason}), status


def _validate_admin_key(locker, code):
    """Llave digital del admin: abre una caja para cargar productos, sin tocar pedidos."""
    key = AdminKey.query.filter_by(code=code.upper()).first()
    if not key:
        return _reject(locker, "Llave no encontrada", 404, code)
    if key.locker_id != locker.id:
        return _reject(locker, "Esta llave no pertenece a este locker", 403, code)
    if key.status == "revocado":
        return _reject(locker, "Llave revocada", 410, code)
    if not key.is_valid():
        return _reject(locker, "Llave usada o expirada", 410, code)

    key.use_count += 1
    key.last_used_at = datetime.utcnow()
    if key.single_use:
        key.status = "usado"
    who = key.creator.name if key.creator else "admin"
    _log(locker, "carga", key.box.box_number, f"Llave de {who}")
    db.session.commit()

    return jsonify({
        "valid": True,
        "mode": "carga",
        "box_number": key.box.box_number,
        "open_seconds": current_app.config["DEVICE_OPEN_SECONDS"],
    })


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

    Códigos que empiezan con MLH-ADM- son llaves digitales del administrador
    (respuesta con "mode": "carga"); el resto son códigos de retiro de clientes
    (respuesta con "mode": "retiro").
    """
    data = request.get_json(silent=True) or {}
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
    code = str(code).strip()

    if code.upper().startswith(ADMIN_PREFIX):
        return _validate_admin_key(locker, code)

    pickup = PickupCode.query.filter_by(code=code).first()

    if not pickup:
        return _reject(locker, "Código no encontrado", 404, code)

    if pickup.box.locker_id != locker.id:
        return _reject(locker, "Este código no pertenece a este locker", 403, code)

    if not pickup.is_valid():
        return _reject(locker, "Código usado o expirado", 410, code)

    # Todo bien: marca como usado, libera la caja y actualiza la orden
    pickup.status = "usado"
    pickup.used_at = datetime.utcnow()
    pickup.box.status = "libre"
    pickup.order.status = "retirado"
    _log(locker, "retiro", pickup.box.box_number, f"Pedido {pickup.order_id[:8].upper()}")
    db.session.commit()

    return jsonify({
        "valid": True,
        "mode": "retiro",
        "box_number": pickup.box.box_number,
        "open_seconds": current_app.config["DEVICE_OPEN_SECONDS"],
    })


def _restore_pickup(locker, code):
    """
    Si el ESP32 avisa que la puerta nunca se abrió, devuelve el código al cliente
    para que no pierda su pedido. Solo si pasó poco tiempo desde que se validó y la
    caja sigue libre (nadie más la ocupó mientras tanto).
    """
    if not code:
        return False
    pickup = PickupCode.query.filter_by(code=code).first()
    if not pickup or pickup.box.locker_id != locker.id:
        return False
    if pickup.status != "usado" or not pickup.used_at or pickup.order.status != "retirado":
        return False

    window = timedelta(seconds=current_app.config["RESTORE_WINDOW_SECONDS"])
    now = datetime.utcnow()
    if now - pickup.used_at > window or now >= pickup.expires_at:
        return False
    if pickup.box.status != "libre":
        return False

    # Si el ESP32 ya reportó que la puerta se abrió después de validar, el cliente sí retiró
    abierta = LockerEvent.query.filter(
        LockerEvent.locker_id == locker.id,
        LockerEvent.kind == "puerta_abierta",
        LockerEvent.box_number == pickup.box.box_number,
        LockerEvent.created_at >= pickup.used_at,
    ).first()
    if abierta:
        return False

    pickup.status = "activo"
    pickup.used_at = None
    pickup.box.status = "ocupado"
    pickup.order.status = "pagado"
    return True


@locker_device_bp.post("/event")
def device_event():
    """
    El ESP32 reporta lo que pasó físicamente. Queda en la bitácora del locker.
    Body: {"device_id": "LOCKER-001", "event": "puerta_abierta", "box_number": 1,
           "code": "MLH-...", "detail": "texto opcional"}
    event: arranque | puerta_abierta | puerta_cerrada | sin_apertura | puerta_forzada
    Con "sin_apertura" y el "code" del cliente, el backend le devuelve el código si
    la puerta nunca se abrió.
    """
    data = request.get_json(silent=True) or {}
    device_id = data.get("device_id")
    event = data.get("event")

    if not device_id or not event:
        return jsonify({"ok": False, "reason": "device_id y event son requeridos"}), 400
    if event not in DEVICE_EVENTS:
        return jsonify({"ok": False, "reason": "Evento no reconocido"}), 400

    locker = Locker.query.filter_by(device_id=device_id).first()
    if not locker:
        return jsonify({"ok": False, "reason": "Locker no reconocido"}), 404
    if not _check_device_key(locker):
        return jsonify({"ok": False, "reason": "Clave de dispositivo inválida"}), 401

    try:
        box_number = int(data["box_number"]) if data.get("box_number") is not None else None
    except (TypeError, ValueError):
        box_number = None

    locker.last_seen = datetime.utcnow()
    _log(locker, event, box_number, data.get("detail"))

    restored = False
    if event == "sin_apertura":
        restored = _restore_pickup(locker, str(data.get("code") or "").strip())
        if restored:
            _log(locker, "codigo_restaurado", box_number, "La puerta no se abrió; el código sigue activo")

    db.session.commit()
    return jsonify({"ok": True, "restored": restored})


@locker_device_bp.post("/heartbeat")
def heartbeat():
    """
    Señal periódica del ESP32 (por ejemplo cada 30 s) para que el panel de
    administración muestre si el locker está en línea.
    Body: {"device_id": "LOCKER-001"}  ·  Cabecera: X-Device-Key (si aplica)
    """
    data = request.get_json(silent=True) or {}
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


@locker_device_bp.post("/commands")
def device_commands():
    """
    El ESP32 consulta cada pocos segundos si el admin pidió abrir alguna caja con el
    botón del panel. También cuenta como señal de vida (marca el locker en línea).
    Body: {"device_id": "LOCKER-001"}  ·  Cabecera: X-Device-Key (si aplica)
    Respuesta: {"commands": [{"id": "...", "action": "open", "box_number": 2,
                              "mode": "carga", "open_seconds": 5}]}
    Cada orden se entrega UNA sola vez.
    """
    data = request.get_json(silent=True) or {}
    device_id = data.get("device_id")
    if not device_id:
        return jsonify({"commands": [], "reason": "device_id es requerido"}), 400

    locker = Locker.query.filter_by(device_id=device_id).first()
    if not locker:
        return jsonify({"commands": [], "reason": "Locker no reconocido"}), 404
    if not _check_device_key(locker):
        return jsonify({"commands": [], "reason": "Clave de dispositivo inválida"}), 401

    now = datetime.utcnow()
    locker.last_seen = now

    # Además de las "pendiente", se entregan por HTTP las "enviado" (publicadas por MQTT)
    # que el ESP32 no confirmó (ack) a tiempo: el broker acepta el mensaje aunque el ESP32
    # no esté suscrito, y en Vercel el ack puede no procesarse. Sin esto la orden se perdía.
    grace = current_app.config.get("MQTT_ACK_GRACE_SECONDS", 4)
    pending = [
        c for c in (
            OpenCommand.query.filter(
                OpenCommand.locker_id == locker.id,
                OpenCommand.status.in_(("pendiente", "enviado")),
            )
            .order_by(OpenCommand.created_at)
            .all()
        )
        if c.status == "pendiente" or now - c.created_at >= timedelta(seconds=grace)
    ]
    commands = []
    for cmd in pending:
        if now >= cmd.expires_at:
            cmd.status = "expirado"
            continue
        cmd.status = "entregado"
        cmd.delivered_at = now
        who = cmd.creator.name if cmd.creator else "admin"
        _log(locker, "carga", cmd.box.box_number, f"Botón Abrir de {who}")
        commands.append({
            "id": cmd.id,
            "action": "open",
            "box_number": cmd.box.box_number,
            "mode": "carga",
            "open_seconds": current_app.config["DEVICE_OPEN_SECONDS"],
        })
    db.session.commit()
    return jsonify({"commands": commands})
