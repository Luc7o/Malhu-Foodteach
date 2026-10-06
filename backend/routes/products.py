from flask import Blueprint, request, jsonify, current_app

from extensions import db
from images import delete_local_image, save_product_image
from models import Product
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


@products_bp.get("/products")
def list_products():
    products = Product.query.filter_by(active=True).order_by(Product.name).all()
    return jsonify([p.to_dict() for p in products])


@products_bp.get("/admin/products")
@admin_required
def list_all_products():
    """Incluye productos inactivos, para el panel de administración."""
    products = Product.query.order_by(Product.name).all()
    return jsonify([p.to_dict() for p in products])


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

    product = Product(
        name=str(data["name"]).strip(),
        description=data.get("description", ""),
        category=(data.get("category") or "").strip() or None,
        price=price,
        stock=stock,
        image_url=(data.get("image_url") or "").strip() or None,
        active=data.get("active", True),
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


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

    for field in ["name", "description", "active"]:
        if field in data:
            setattr(product, field, data[field])
    if "category" in data:
        product.category = (data["category"] or "").strip() or None

    old_image = product.image_url
    if "image_url" in data:
        product.image_url = (data["image_url"] or "").strip() or None

    db.session.commit()

    # Si cambió o se quitó la imagen, borra del disco la anterior (solo si la subimos nosotros)
    if "image_url" in data and old_image != product.image_url:
        delete_local_image(old_image, current_app.config["UPLOAD_FOLDER"])
    return jsonify(product.to_dict())


@products_bp.delete("/admin/products/<product_id>")
@admin_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    # Baja lógica en vez de borrar físico, para no romper pedidos históricos
    product.active = False
    db.session.commit()
    return jsonify({"ok": True})
