from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import get_jwt_identity

from extensions import db
from models import AdminKey, Locker, LockerBox, LockerEvent, PickupCode
from utils import admin_required, qr_data_url

lockers_bp = Blueprint("lockers", __name__, url_prefix="/api")

MAX_BOXES = 64
ADMIN_BOX_STATUSES = {"libre", "mantenimiento"}


def _admin_locker_dict(locker):
    """Locker con cajas + el pedido activo de cada caja ocupada."""
    data = locker.to_dict(admin=True)
    active = {
        p.box_id: p
        for p in PickupCode.query.filter(
            PickupCode.status == "activo",
            PickupCode.box_id.in_([b.id for b in locker.boxes] or [""]),
        ).all()
    }
    for box in data["boxes"]:
        pickup = active.get(box["id"])
        box["order_id"] = pickup.order_id if pickup else None
        box["pickup_code"] = pickup.code if pickup else None
        box["pickup_expires_at"] = (
            pickup.expires_at.isoformat() + "Z" if pickup else None
        )

    # Llaves digitales de admin que siguen vigentes para este locker
    keys = (
        AdminKey.query.filter(
            AdminKey.locker_id == locker.id,
            AdminKey.status == "activo",
            AdminKey.expires_at > datetime.utcnow(),
        )
        .order_by(AdminKey.created_at.desc())
        .all()
    )
    data["keys"] = [k.to_dict() for k in keys]

    # Últimos movimientos del locker (accesos, cargas, alertas)
    events = (
        LockerEvent.query.filter_by(locker_id=locker.id)
        .order_by(LockerEvent.created_at.desc())
        .limit(8)
        .all()
    )
    data["events"] = [e.to_dict() for e in events]
    return data


def _add_boxes(locker, target):
    current = len(locker.boxes)
    for n in range(current + 1, target + 1):
        db.session.add(LockerBox(locker_id=locker.id, box_number=n, status="libre"))


@lockers_bp.get("/lockers")
def list_lockers():
    lockers = Locker.query.filter_by(active=True).order_by(Locker.name).all()
    return jsonify([l.to_dict() for l in lockers])


@lockers_bp.get("/admin/lockers")
@admin_required
def admin_list_lockers():
    lockers = Locker.query.order_by(Locker.name).all()
    return jsonify([_admin_locker_dict(l) for l in lockers])


@lockers_bp.post("/admin/lockers")
@admin_required
def create_locker():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    device_id = (data.get("device_id") or "").strip()
    if not name or not device_id:
        return jsonify({"error": "name y device_id son requeridos"}), 400
    if Locker.query.filter_by(device_id=device_id).first():
        return jsonify({"error": "Ya existe un locker con ese device_id"}), 409

    try:
        num_boxes = int(data.get("num_boxes", 1))
    except (TypeError, ValueError):
        return jsonify({"error": "num_boxes debe ser un entero"}), 400
    if not 1 <= num_boxes <= MAX_BOXES:
        return jsonify({"error": f"num_boxes debe estar entre 1 y {MAX_BOXES}"}), 400

    locker = Locker(
        name=name,
        address=data.get("address"),
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        device_id=device_id,
        device_key=Locker.generate_key(),
    )
    db.session.add(locker)
    db.session.flush()  # para tener locker.id antes del commit
    _add_boxes(locker, num_boxes)
    db.session.commit()
    return jsonify(_admin_locker_dict(locker)), 201


@lockers_bp.put("/admin/lockers/<locker_id>")
@admin_required
def update_locker(locker_id):
    locker = Locker.query.get_or_404(locker_id)
    data = request.get_json() or {}

    if "name" in data:
        if not str(data["name"]).strip():
            return jsonify({"error": "El nombre no puede estar vacío"}), 400
        locker.name = str(data["name"]).strip()
    for field in ["address", "latitude", "longitude", "active"]:
        if field in data:
            setattr(locker, field, data[field])

    if "num_boxes" in data:
        try:
            target = int(data["num_boxes"])
        except (TypeError, ValueError):
            return jsonify({"error": "num_boxes debe ser un entero"}), 400
        if target < len(locker.boxes):
            return jsonify({"error": "Por ahora solo se pueden agregar cajas, no quitarlas"}), 400
        if target > MAX_BOXES:
            return jsonify({"error": f"El máximo es {MAX_BOXES} cajas"}), 400
        _add_boxes(locker, target)

    db.session.commit()
    return jsonify(_admin_locker_dict(locker))


@lockers_bp.post("/admin/lockers/<locker_id>/rotate-key")
@admin_required
def rotate_key(locker_id):
    """Genera (o reemplaza) la clave del ESP32. Hay que copiarla al firmware."""
    locker = Locker.query.get_or_404(locker_id)
    locker.device_key = Locker.generate_key()
    db.session.commit()
    return jsonify(_admin_locker_dict(locker))


@lockers_bp.get("/admin/lockers/<locker_id>/boxes")
@admin_required
def list_boxes(locker_id):
    boxes = LockerBox.query.filter_by(locker_id=locker_id).order_by(LockerBox.box_number).all()
    return jsonify([b.to_dict() for b in boxes])


@lockers_bp.patch("/admin/boxes/<box_id>")
@admin_required
def update_box(box_id):
    """Marca una caja como libre o en mantenimiento (p. ej. después de vaciarla)."""
    box = LockerBox.query.get_or_404(box_id)
    status = (request.get_json() or {}).get("status")
    if status not in ADMIN_BOX_STATUSES:
        return jsonify({"error": "status debe ser 'libre' o 'mantenimiento'"}), 400

    has_active = PickupCode.query.filter_by(box_id=box.id, status="activo").first()
    if has_active:
        return jsonify({
            "error": "Esta caja tiene un pedido activo. Cancela el pedido para liberarla."
        }), 409

    box.status = status
    db.session.commit()
    return jsonify(box.to_dict())


@lockers_bp.post("/admin/lockers/<locker_id>/keys")
@admin_required
def create_admin_key(locker_id):
    """
    Crea una llave digital (QR) para abrir UNA caja y cargar productos.
    Body: {"box_number": 2, "minutes": 10, "single_use": false}
    Devuelve la llave y su QR (imagen en base64) para mostrarlo frente al lector.
    """
    locker = Locker.query.get_or_404(locker_id)
    data = request.get_json(silent=True) or {}

    try:
        box_number = int(data.get("box_number"))
    except (TypeError, ValueError):
        return jsonify({"error": "box_number es requerido"}), 400
    box = LockerBox.query.filter_by(locker_id=locker.id, box_number=box_number).first()
    if not box:
        return jsonify({"error": "Esa caja no existe en este locker"}), 404

    max_minutes = current_app.config["ADMIN_KEY_MAX_MINUTES"]
    try:
        minutes = int(data.get("minutes", current_app.config["ADMIN_KEY_DEFAULT_MINUTES"]))
    except (TypeError, ValueError):
        return jsonify({"error": "minutes debe ser un entero"}), 400
    if not 1 <= minutes <= max_minutes:
        return jsonify({"error": f"minutes debe estar entre 1 y {max_minutes}"}), 400

    key = AdminKey(
        locker_id=locker.id,
        box_id=box.id,
        created_by=get_jwt_identity(),
        code=AdminKey.generate_code(),
        single_use=bool(data.get("single_use", False)),
        expires_at=datetime.utcnow() + timedelta(minutes=minutes),
    )
    db.session.add(key)
    db.session.commit()

    out = key.to_dict()
    out["qr_image_base64"] = qr_data_url(key.code)
    return jsonify(out), 201


@lockers_bp.get("/admin/keys/<key_id>/qr")
@admin_required
def get_admin_key_qr(key_id):
    """Vuelve a mostrar el QR de una llave que todavía está vigente."""
    key = AdminKey.query.get_or_404(key_id)
    if not key.is_valid():
        return jsonify({"error": "La llave ya no está activa"}), 410
    out = key.to_dict()
    out["qr_image_base64"] = qr_data_url(key.code)
    return jsonify(out)


@lockers_bp.delete("/admin/keys/<key_id>")
@admin_required
def revoke_admin_key(key_id):
    """Revoca una llave antes de que venza (por ejemplo, si se compartió el QR por error)."""
    key = AdminKey.query.get_or_404(key_id)
    if key.status == "activo":
        key.status = "revocado"
        db.session.commit()
    return jsonify(key.to_dict())
