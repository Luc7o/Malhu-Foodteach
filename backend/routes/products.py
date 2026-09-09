from flask import Blueprint, request, jsonify

from extensions import db
from models import Product
from utils import admin_required

products_bp = Blueprint("products", __name__, url_prefix="/api")


@products_bp.get("/products")
def list_products():
    products = Product.query.filter_by(active=True).all()
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

    product = Product(
        name=data["name"],
        description=data.get("description", ""),
        price=data["price"],
        stock=data["stock"],
        image_url=data.get("image_url"),
        active=data.get("active", True),
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@products_bp.put("/admin/products/<product_id>")
@admin_required
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json() or {}

    for field in ["name", "description", "price", "stock", "image_url", "active"]:
        if field in data:
            setattr(product, field, data[field])

    db.session.commit()
    return jsonify(product.to_dict())


@products_bp.delete("/admin/products/<product_id>")
@admin_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    # Baja lógica en vez de borrar físico, para no romper pedidos históricos
    product.active = False
    db.session.commit()
    return jsonify({"ok": True})
