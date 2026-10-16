from flask import Blueprint, jsonify, request
from sqlalchemy import func

from extensions import db
from models import Category, Product
from utils import admin_required

categories_bp = Blueprint("categories", __name__, url_prefix="/api")


def _clean_name(data):
    name = " ".join(str(data.get("name") or "").split())
    if not name:
        return None, "El nombre de la categoría es obligatorio"
    if len(name) > 60:
        return None, "El nombre puede tener hasta 60 caracteres"
    return name, None


def _name_taken(name, exclude_id=None):
    q = Category.query.filter(func.lower(Category.name) == name.lower())
    if exclude_id:
        q = q.filter(Category.id != exclude_id)
    return q.first() is not None


@categories_bp.get("/categories")
def list_public_categories():
    """Categorías que tienen al menos un producto publicado, en el orden que definió el admin."""
    cats = Category.query.order_by(Category.sort_order, Category.name).all()
    return jsonify([
        c.to_dict() for c in cats
        if any(p.status == "publicado" for p in c.products)
    ])


@categories_bp.get("/admin/categories")
@admin_required
def list_admin_categories():
    cats = Category.query.order_by(Category.sort_order, Category.name).all()
    return jsonify([c.to_dict(counts=True) for c in cats])


@categories_bp.post("/admin/categories")
@admin_required
def create_category():
    name, error = _clean_name(request.get_json() or {})
    if error:
        return jsonify({"error": error}), 400
    if _name_taken(name):
        return jsonify({"error": "Ya existe una categoría con ese nombre"}), 409
    last = db.session.query(func.max(Category.sort_order)).scalar()
    cat = Category(name=name, sort_order=(last + 1) if last is not None else 0)
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict(counts=True)), 201


@categories_bp.put("/admin/categories/<category_id>")
@admin_required
def update_category(category_id):
    cat = Category.query.get_or_404(category_id)
    name, error = _clean_name(request.get_json() or {})
    if error:
        return jsonify({"error": error}), 400
    if _name_taken(name, exclude_id=cat.id):
        return jsonify({"error": "Ya existe una categoría con ese nombre"}), 409
    cat.name = name
    # Mantiene igual el texto legado de los productos de esta categoría
    Product.query.filter_by(category_id=cat.id).update({"category": name})
    db.session.commit()
    return jsonify(cat.to_dict(counts=True))


@categories_bp.delete("/admin/categories/<category_id>")
@admin_required
def delete_category(category_id):
    """
    Elimina una categoría. Si tiene productos hay que decir qué hacer con ellos:
    ?move_to=<id de otra categoría> o ?move_to=none (quedan sin categoría).
    """
    cat = Category.query.get_or_404(category_id)
    count = len(cat.products)
    move_to = request.args.get("move_to")

    if count and not move_to:
        return jsonify({
            "error": f"Esta categoría tiene {count} producto(s). Elige a dónde moverlos.",
            "product_count": count,
        }), 409

    if count:
        target = None
        if move_to != "none":
            target = Category.query.get(move_to)
            if not target or target.id == cat.id:
                return jsonify({"error": "La categoría de destino no es válida"}), 400
        Product.query.filter_by(category_id=cat.id).update({
            "category_id": target.id if target else None,
            "category": target.name if target else None,
        })

    db.session.delete(cat)
    db.session.commit()
    return jsonify({"ok": True, "moved": count})


@categories_bp.post("/admin/categories/reorder")
@admin_required
def reorder_categories():
    """Body: {"ids": [id1, id2, ...]} en el orden deseado."""
    ids = (request.get_json() or {}).get("ids")
    if not isinstance(ids, list) or not ids:
        return jsonify({"error": "ids debe ser una lista"}), 400
    cats = {c.id: c for c in Category.query.filter(Category.id.in_(ids)).all()}
    for position, cid in enumerate(ids):
        if cid in cats:
            cats[cid].sort_order = position
    db.session.commit()
    return jsonify({"ok": True})
