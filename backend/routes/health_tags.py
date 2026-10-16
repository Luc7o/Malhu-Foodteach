from flask import Blueprint, jsonify, request
from sqlalchemy import func

from extensions import db
from models import HealthTag
from utils import admin_required

health_tags_bp = Blueprint("health_tags", __name__, url_prefix="/api")


def _clean_name(data):
    name = " ".join(str(data.get("name") or "").split())
    if not name:
        return None, "El nombre de la etiqueta es obligatorio"
    if len(name) > 60:
        return None, "El nombre puede tener hasta 60 caracteres"
    return name, None


def _name_taken(name, exclude_id=None):
    q = HealthTag.query.filter(func.lower(HealthTag.name) == name.lower())
    if exclude_id:
        q = q.filter(HealthTag.id != exclude_id)
    return q.first() is not None


@health_tags_bp.get("/health-tags")
def list_public_tags():
    """Etiquetas que tienen al menos un producto publicado, en el orden que definió el admin."""
    tags = HealthTag.query.order_by(HealthTag.sort_order, HealthTag.name).all()
    return jsonify([t.to_dict() for t in tags if any(p.status == "publicado" for p in t.products)])


@health_tags_bp.get("/admin/health-tags")
@admin_required
def list_admin_tags():
    tags = HealthTag.query.order_by(HealthTag.sort_order, HealthTag.name).all()
    return jsonify([t.to_dict(counts=True) for t in tags])


@health_tags_bp.post("/admin/health-tags")
@admin_required
def create_tag():
    name, error = _clean_name(request.get_json() or {})
    if error:
        return jsonify({"error": error}), 400
    if _name_taken(name):
        return jsonify({"error": "Ya existe una etiqueta con ese nombre"}), 409
    last = db.session.query(func.max(HealthTag.sort_order)).scalar()
    tag = HealthTag(name=name, sort_order=(last + 1) if last is not None else 0)
    db.session.add(tag)
    db.session.commit()
    return jsonify(tag.to_dict(counts=True)), 201


@health_tags_bp.put("/admin/health-tags/<tag_id>")
@admin_required
def update_tag(tag_id):
    tag = HealthTag.query.get_or_404(tag_id)
    name, error = _clean_name(request.get_json() or {})
    if error:
        return jsonify({"error": error}), 400
    if _name_taken(name, exclude_id=tag.id):
        return jsonify({"error": "Ya existe una etiqueta con ese nombre"}), 409
    tag.name = name
    db.session.commit()
    return jsonify(tag.to_dict(counts=True))


@health_tags_bp.delete("/admin/health-tags/<tag_id>")
@admin_required
def delete_tag(tag_id):
    """Elimina la etiqueta y se la quita a todos sus productos (los productos no se tocan)."""
    tag = HealthTag.query.get_or_404(tag_id)
    count = len(tag.products)
    db.session.delete(tag)
    db.session.commit()
    return jsonify({"ok": True, "removed_from": count})


@health_tags_bp.post("/admin/health-tags/reorder")
@admin_required
def reorder_tags():
    """Body: {"ids": [id1, id2, ...]} en el orden deseado."""
    ids = (request.get_json() or {}).get("ids")
    if not isinstance(ids, list) or not ids:
        return jsonify({"error": "ids debe ser una lista"}), 400
    tags = {t.id: t for t in HealthTag.query.filter(HealthTag.id.in_(ids)).all()}
    for position, tid in enumerate(ids):
        if tid in tags:
            tags[tid].sort_order = position
    db.session.commit()
    return jsonify({"ok": True})
