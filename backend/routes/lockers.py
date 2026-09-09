from flask import Blueprint, request, jsonify

from extensions import db
from models import Locker, LockerBox
from utils import admin_required

lockers_bp = Blueprint("lockers", __name__, url_prefix="/api")


@lockers_bp.get("/lockers")
def list_lockers():
    lockers = Locker.query.filter_by(active=True).all()
    return jsonify([l.to_dict() for l in lockers])


@lockers_bp.post("/admin/lockers")
@admin_required
def create_locker():
    data = request.get_json() or {}
    if "name" not in data or "device_id" not in data:
        return jsonify({"error": "name y device_id son requeridos"}), 400

    locker = Locker(
        name=data["name"],
        address=data.get("address"),
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        device_id=data["device_id"],
    )
    db.session.add(locker)
    db.session.flush()  # para tener locker.id antes del commit

    # Crea automáticamente N cajas para este locker (default 1, útil para tu prototipo)
    num_boxes = int(data.get("num_boxes", 1))
    for i in range(1, num_boxes + 1):
        db.session.add(LockerBox(locker_id=locker.id, box_number=i, status="libre"))

    db.session.commit()
    return jsonify(locker.to_dict()), 201


@lockers_bp.get("/admin/lockers/<locker_id>/boxes")
@admin_required
def list_boxes(locker_id):
    boxes = LockerBox.query.filter_by(locker_id=locker_id).all()
    return jsonify([b.to_dict() for b in boxes])
