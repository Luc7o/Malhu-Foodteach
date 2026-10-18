from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import func

from extensions import db
from images import delete_local_image, save_product_image
from models import Category, Product, PRODUCT_STATUSES
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


def _requested_status(data):
    """status explícito, o el booleano 'active' de versiones anteriores."""
    if "status" in data:
        status = data["status"]
        return (status, None) if status in PRODUCT_STATUSES else (None, "Estado de producto no válido")
    if "active" in data:
        return ("publicado" if data["active"] else "archivado"), None
    return None, None


<<<<<<< Updated upstream
=======
NUTRITION_LIMITS = {
    "calories": 5000, "protein_g": 1000, "carbs_g": 1000, "fat_g": 1000,
    "fiber_g": 1000, "sugar_g": 1000, "sat_fat_g": 1000, "sodium_mg": 20000,
}
MAX_OPTION_GROUPS = 8
MAX_ITEMS_PER_GROUP = 30


def _parse_nutrition(data):
    """
    Devuelve (campos_a_cambiar, error). Solo incluye las claves que llegaron en `data`;
    un valor vacío borra el dato.
    """
    changes = {}
    for field, limit in NUTRITION_LIMITS.items():
        if field not in data:
            continue
        raw = data[field]
        if raw is None or (isinstance(raw, str) and not raw.strip()):
            changes[field] = None
            continue
        try:
            value = int(float(raw)) if field in ("calories", "sodium_mg") else round(float(raw), 1)
        except (TypeError, ValueError):
            return None, f"{field} debe ser un número"
        if value < 0 or value > limit:
            return None, f"{field} debe estar entre 0 y {limit}"
        changes[field] = value
    if "serving" in data:
        serving = " ".join(str(data["serving"] or "").split())
        if len(serving) > 60:
            return None, "La porción puede tener hasta 60 caracteres"
        changes["serving"] = serving or None
    if "ingredients_text" in data:
        text = " ".join(str(data["ingredients_text"] or "").split())
        if len(text) > 1000:
            return None, "Los ingredientes pueden tener hasta 1000 caracteres"
        changes["ingredients_text"] = text or None
    if "allergens" in data:
        allergens = " ".join(str(data["allergens"] or "").split())
        if len(allergens) > 200:
            return None, "Los alérgenos pueden tener hasta 200 caracteres"
        changes["allergens"] = allergens or None
    return changes, None


def _apply_option_groups(product, groups_data):
    """
    Reemplaza los grupos de opciones del plato. Los grupos y opciones que traen `id` se
    actualizan (así los carritos abiertos no se rompen); los demás se crean; los que faltan se quitan.
    Devuelve un mensaje de error o None. No hace commit.
    """
    if not isinstance(groups_data, list):
        return "option_groups debe ser una lista"
    if len(groups_data) > MAX_OPTION_GROUPS:
        return f"Un plato puede tener hasta {MAX_OPTION_GROUPS} grupos de opciones"

    existing_groups = {g.id: g for g in product.option_groups}
    kept_groups = []
    for position, gd in enumerate(groups_data):
        if not isinstance(gd, dict):
            return "Grupo de opciones no válido"
        name = " ".join(str(gd.get("name") or "").split())
        if not name:
            return "Cada grupo de opciones necesita un nombre"
        if len(name) > 60:
            return "El nombre del grupo puede tener hasta 60 caracteres"
        try:
            min_select = int(gd.get("min_select", 0))
            max_select = int(gd.get("max_select", 1))
        except (TypeError, ValueError):
            return f"«{name}»: mínimo y máximo deben ser números enteros"
        items_data = gd.get("items")
        if not isinstance(items_data, list) or not items_data:
            return f"«{name}»: agrega al menos una opción"
        if len(items_data) > MAX_ITEMS_PER_GROUP:
            return f"«{name}»: máximo {MAX_ITEMS_PER_GROUP} opciones"
        if min_select < 0 or max_select < 1 or min_select > max_select:
            return f"«{name}»: el mínimo no puede superar al máximo y el máximo debe ser al menos 1"
        if max_select > len(items_data):
            return f"«{name}»: el máximo ({max_select}) no puede ser mayor que las opciones disponibles ({len(items_data)})"

        group = existing_groups.get(gd.get("id"))
        if group is None:
            group = OptionGroup()
            product.option_groups.append(group)
        group.name, group.min_select, group.max_select, group.sort_order = name, min_select, max_select, position

        existing_items = {i.id: i for i in group.items}
        kept_items, seen = [], set()
        for ipos, idata in enumerate(items_data):
            if not isinstance(idata, dict):
                return f"«{name}»: opción no válida"
            ing_id = idata.get("ingredient_id")
            if ing_id == product.id:
                return f"«{name}»: un plato no puede ser su propio ingrediente"
            if ing_id in seen:
                return f"«{name}»: el mismo producto está repetido"
            seen.add(ing_id)
            ingredient = Product.query.get(ing_id) if ing_id else None
            if not ingredient:
                return f"«{name}»: uno de los productos elegidos no existe"
            if ingredient.is_customizable():
                return f"«{name}»: «{ingredient.name}» ya es un plato personalizable y no puede ser ingrediente"
            try:
                extra = round(float(idata.get("extra_price") or 0), 2)
            except (TypeError, ValueError):
                return f"«{name}»: el precio extra debe ser un número"
            if extra < 0 or extra > 9999:
                return f"«{name}»: el precio extra no es válido"
            item = existing_items.get(idata.get("id"))
            if item is None:
                item = OptionGroupItem()
                group.items.append(item)
            item.ingredient_id, item.extra_price, item.sort_order = ingredient.id, extra, ipos
            kept_items.append(item)
        for item in list(group.items):
            if item not in kept_items:
                group.items.remove(item)
        kept_groups.append(group)

    for group in list(product.option_groups):
        if group not in kept_groups:
            product.option_groups.remove(group)
    return None


>>>>>>> Stashed changes
def _order_by():
    return (Product.featured.desc(), Product.sort_order, Product.name)


@products_bp.get("/products")
def list_products():
    products = Product.query.filter_by(active=True).order_by(*_order_by()).all()
    return jsonify([p.to_dict() for p in products])


@products_bp.get("/admin/products")
@admin_required
def list_all_products():
    """Incluye borradores y archivados, para el panel de administración."""
    products = Product.query.order_by(*_order_by()).all()
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
