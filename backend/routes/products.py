from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from extensions import db
from images import delete_local_image, save_product_image
from models import Category, HealthTag, MAX_HEALTH_TAGS_PER_PRODUCT, Product, PRODUCT_STATUSES
from utils import admin_required

products_bp = Blueprint("products", __name__, url_prefix="/api")


def _parse_price_stock(data, product=None):
    """Valida price y stock. Devuelve (price, stock, error)."""
    price = data.get("price", product.price if product else None)
    stock = data.get("stock", product.stock if product else None)
    try:
        price = round(float(price), 2)
        stock = int(stock)
    except (TypeError, ValueError):
        return None, None, "price debe ser un número y stock un entero"
    if price < 0 or stock < 0:
        return None, None, "price y stock no pueden ser negativos"
    return price, stock, None


def _resolve_category(data):
    """
    Devuelve (categoria_o_None, error). Acepta category_id (lo normal) o, por
    compatibilidad con versiones anteriores, el texto "category" (se crea si no existe).
    """
    if "category_id" in data:
        cid = data.get("category_id")
        if not cid:
            return None, None
        cat = Category.query.get(cid)
        if not cat:
            return None, "La categoría elegida no existe"
        return cat, None

    name = " ".join(str(data.get("category") or "").split())
    if not name:
        return None, None
    cat = Category.query.filter(func.lower(Category.name) == name.lower()).first()
    if not cat:
        last = db.session.query(func.max(Category.sort_order)).scalar()
        cat = Category(name=name[:60], sort_order=(last + 1) if last is not None else 0)
        db.session.add(cat)
        db.session.flush()
    return cat, None


def _resolve_tags(data):
    """
    Devuelve (lista_de_etiquetas_o_None, error). None significa "no se envió health_tag_ids":
    el producto conserva las que tiene.
    """
    ids = data.get("health_tag_ids")
    if ids is None:
        return None, None
    if not isinstance(ids, list):
        return None, "health_tag_ids debe ser una lista"
    ids = list(dict.fromkeys(ids))
    if len(ids) > MAX_HEALTH_TAGS_PER_PRODUCT:
        return None, f"Un producto puede tener hasta {MAX_HEALTH_TAGS_PER_PRODUCT} etiquetas de salud"
    tags = HealthTag.query.filter(HealthTag.id.in_(ids)).all() if ids else []
    if len(tags) != len(ids):
        return None, "Alguna etiqueta de salud no existe"
    return tags, None


def _requested_status(data):
    """status explícito, o el booleano 'active' de versiones anteriores."""
    if "status" in data:
        status = data["status"]
        return (status, None) if status in PRODUCT_STATUSES else (None, "Estado de producto no válido")
    if "active" in data:
        return ("publicado" if data["active"] else "archivado"), None
    return None, None


def _order_by():
    return (Product.featured.desc(), Product.sort_order, Product.name)


def _with_relations(query):
    return query.options(selectinload(Product.category_ref), selectinload(Product.health_tags))


@products_bp.get("/products")
def list_products():
    products = _with_relations(Product.query.filter_by(active=True)).order_by(*_order_by()).all()
    return jsonify([p.to_dict() for p in products])


@products_bp.get("/admin/products")
@admin_required
def list_all_products():
    """Incluye borradores y archivados, para el panel de administración."""
    products = _with_relations(Product.query).order_by(*_order_by()).all()
    return jsonify([p.to_dict(admin=True) for p in products])


@products_bp.get("/products/<product_id>")
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict())


@products_bp.post("/admin/products")
@admin_required
def create_product():
    data = request.get_json() or {}
    required = ["name", "price", "stock"]
    if any(f not in data for f in required):
        return jsonify({"error": f"Campos requeridos: {required}"}), 400
    if not str(data["name"]).strip():
        return jsonify({"error": "El nombre no puede estar vacío"}), 400

    price, stock, error = _parse_price_stock(data)
    if error:
        return jsonify({"error": error}), 400
    category, error = _resolve_category(data)
    if error:
        return jsonify({"error": error}), 400
    status, error = _requested_status(data)
    if error:
        return jsonify({"error": error}), 400
    tags, error = _resolve_tags(data)
    if error:
        return jsonify({"error": error}), 400

    product = Product(
        name=str(data["name"]).strip(),
        description=data.get("description", ""),
        price=price,
        stock=stock,
        image_url=(data.get("image_url") or "").strip() or None,
        featured=bool(data.get("featured", False)),
        sold_out=bool(data.get("sold_out", False)),
    )
    product.category_ref = category
    product.category = category.name if category else None
    product.set_status(status or "publicado")
    product.health_tags = tags or []
    # Los productos nuevos van al final del orden manual
    last = db.session.query(func.max(Product.sort_order)).scalar()
    product.sort_order = (last + 1) if last is not None else 0
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict(admin=True)), 201


@products_bp.post("/admin/products/image")
@admin_required
def upload_product_image():
    """
    Sube la foto de un producto (multipart/form-data, campo "image").
    Devuelve {"image_url": "/uploads/products/xxxx.jpg"}; esa URL se guarda en el producto
    al crearlo o editarlo.
    """
    try:
        url = save_product_image(request.files.get("image"), current_app.config["UPLOAD_FOLDER"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"image_url": url}), 201


@products_bp.post("/admin/products/reorder")
@admin_required
def reorder_products():
    """Body: {"ids": [id1, id2, ...]} en el orden deseado para el menú."""
    ids = (request.get_json() or {}).get("ids")
    if not isinstance(ids, list) or not ids:
        return jsonify({"error": "ids debe ser una lista"}), 400
    products = {p.id: p for p in Product.query.filter(Product.id.in_(ids)).all()}
    for position, pid in enumerate(ids):
        if pid in products:
            products[pid].sort_order = position
    db.session.commit()
    return jsonify({"ok": True})


@products_bp.put("/admin/products/<product_id>")
@admin_required
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json() or {}

    if "price" in data or "stock" in data:
        price, stock, error = _parse_price_stock(data, product)
        if error:
            return jsonify({"error": error}), 400
        product.price = price
        product.stock = stock

    for field in ["name", "description"]:
        if field in data:
            setattr(product, field, data[field])
    for field in ["featured", "sold_out"]:
        if field in data:
            setattr(product, field, bool(data[field]))

    if "category_id" in data or "category" in data:
        category, error = _resolve_category(data)
        if error:
            return jsonify({"error": error}), 400
        product.category_ref = category
        product.category = category.name if category else None

    tags, error = _resolve_tags(data)
    if error:
        return jsonify({"error": error}), 400
    if tags is not None:
        product.health_tags = tags

    status, error = _requested_status(data)
    if error:
        return jsonify({"error": error}), 400
    if status:
        product.set_status(status)

    old_image = product.image_url
    if "image_url" in data:
        product.image_url = (data["image_url"] or "").strip() or None

    db.session.commit()

    # Si cambió o se quitó la imagen, borra del disco la anterior (solo si la subimos nosotros)
    if "image_url" in data and old_image != product.image_url:
        delete_local_image(old_image, current_app.config["UPLOAD_FOLDER"])
    return jsonify(product.to_dict(admin=True))


@products_bp.delete("/admin/products/<product_id>")
@admin_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    # Se archiva en vez de borrar, para no romper pedidos históricos
    product.set_status("archivado")
    db.session.commit()
    return jsonify({"ok": True})
