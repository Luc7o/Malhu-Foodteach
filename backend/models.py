import json
import uuid
import secrets
from datetime import datetime, timedelta

from flask import current_app
from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db


def gen_uuid():
    return str(uuid.uuid4())


def iso(dt):
    """Fechas en UTC con sufijo Z, para que el navegador no las interprete como hora local."""
    return dt.isoformat() + "Z" if dt else None


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="cliente")  # cliente | admin
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Cuenta desactivada por un administrador: no puede iniciar sesión ni usar su token
    active = db.Column(db.Boolean, nullable=False, default=True)
    last_login_at = db.Column(db.DateTime, nullable=True)
    # Verificación en dos pasos (TOTP) para administradores
    totp_secret = db.Column(db.String(64), nullable=True)
    totp_enabled = db.Column(db.Boolean, nullable=False, default=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
        }


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(60), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship("Product", back_populates="category_ref", lazy=True)

    def to_dict(self, counts=False):
        data = {"id": self.id, "name": self.name, "sort_order": self.sort_order}
        if counts:
            data["product_count"] = len(self.products)
            data["published_count"] = len([p for p in self.products if p.status == "publicado"])
        return data


PRODUCT_STATUSES = ("publicado", "borrador", "archivado")

# Un producto puede llevar varias etiquetas de salud y una etiqueta tiene varios productos
product_health_tags = db.Table(
    "product_health_tags",
    db.Column("product_id", db.String(36), db.ForeignKey("products.id"), primary_key=True),
    db.Column("tag_id", db.String(36), db.ForeignKey("health_tags.id"), primary_key=True),
)

MAX_HEALTH_TAGS_PER_PRODUCT = 6


class HealthTag(db.Model):
    """Etiqueta de salud ("Para cuidar tu corazón", "Fuente de fibra"...). Se filtra en la tienda."""
    __tablename__ = "health_tags"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(60), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship("Product", secondary=product_health_tags, back_populates="health_tags", lazy=True)

    def to_dict(self, counts=False):
        data = {"id": self.id, "name": self.name, "sort_order": self.sort_order}
        if counts:
            data["product_count"] = len(self.products)
            data["published_count"] = len([p for p in self.products if p.status == "publicado"])
        return data


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    # Texto legado: se mantiene igual al nombre de la categoría para no romper nada.
    # La fuente de verdad es category_id.
    category = db.Column(db.String(60), nullable=True)
    category_id = db.Column(db.String(36), db.ForeignKey("categories.id"), nullable=True, index=True)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)
    image_url = db.Column(db.String(500), nullable=True)
    # publicado = visible en el menú | borrador = aún no publicado | archivado = retirado
    status = db.Column(db.String(12), nullable=False, default="publicado")
    # Espejo de status == "publicado". Toda la tienda sigue filtrando por este campo.
    active = db.Column(db.Boolean, default=True)
    featured = db.Column(db.Boolean, nullable=False, default=False)
    # Agotado a mano (aunque haya unidades en stock)
    sold_out = db.Column(db.Boolean, nullable=False, default=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Información nutricional por porción (opcional). Valores referenciales.
    calories = db.Column(db.Integer, nullable=True)
    protein_g = db.Column(db.Numeric(6, 1), nullable=True)
    carbs_g = db.Column(db.Numeric(6, 1), nullable=True)
    fat_g = db.Column(db.Numeric(6, 1), nullable=True)
    serving = db.Column(db.String(60), nullable=True)  # ej. "1 porción (250 g)"
    # Ingrediente que solo se puede elegir dentro de un plato personalizable (no sale en el menú)
    ingredient_only = db.Column(db.Boolean, nullable=False, default=False)

    category_ref = db.relationship("Category", back_populates="products")
    health_tags = db.relationship("HealthTag", secondary=product_health_tags, back_populates="products", lazy=True)
    option_groups = db.relationship(
        "OptionGroup", back_populates="product", lazy=True,
        order_by="OptionGroup.sort_order", cascade="all, delete-orphan",
    )

    def sorted_health_tags(self):
        return sorted(self.health_tags, key=lambda t: (t.sort_order, t.name.lower()))

    def set_status(self, status):
        self.status = status
        self.active = status == "publicado"

    def category_name(self):
        return self.category_ref.name if self.category_ref else (self.category or None)

    def is_out_of_stock(self):
        return bool(self.sold_out) or self.stock <= 0

    def is_customizable(self):
        return any(g.items for g in self.option_groups)

    def nutrition_dict(self):
        """Información nutricional, o None si el producto no tiene ningún dato cargado."""
        values = {
            "calories": self.calories,
            "protein_g": float(self.protein_g) if self.protein_g is not None else None,
            "carbs_g": float(self.carbs_g) if self.carbs_g is not None else None,
            "fat_g": float(self.fat_g) if self.fat_g is not None else None,
        }
        if all(v is None for v in values.values()):
            return None
        values["serving"] = self.serving
        return values

    def to_dict(self, admin=False):
        data = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category_name(),
            "category_id": self.category_id,
            "price": float(self.price),
            # En la tienda un producto agotado a mano se ve con stock 0
            "stock": self.stock if admin or not self.sold_out else 0,
            "image_url": self.image_url,
            "active": self.active,
            "status": self.status or ("publicado" if self.active else "archivado"),
            "featured": bool(self.featured),
            "sold_out": self.is_out_of_stock(),
            "sort_order": self.sort_order or 0,
            "health_tags": [{"id": t.id, "name": t.name} for t in self.sorted_health_tags()],
            "nutrition": self.nutrition_dict(),
            "ingredient_only": bool(self.ingredient_only),
            "customizable": self.is_customizable(),
            "option_groups": [g.to_dict(admin=admin) for g in self.option_groups],
        }
        if admin:
            threshold = current_app.config.get("LOW_STOCK_THRESHOLD", 3)
            data["sold_out_manual"] = bool(self.sold_out)
            data["low_stock"] = 0 < self.stock <= threshold
        return data


class OptionGroup(db.Model):
    """
    Un paso del armado de un plato personalizable ("Elige tu base", "Proteína", "Toppings").
    El cliente debe elegir entre min_select y max_select opciones de este grupo.
    """
    __tablename__ = "option_groups"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False, index=True)
    name = db.Column(db.String(60), nullable=False)
    min_select = db.Column(db.Integer, nullable=False, default=0)
    max_select = db.Column(db.Integer, nullable=False, default=1)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    product = db.relationship("Product", back_populates="option_groups")
    items = db.relationship(
        "OptionGroupItem", back_populates="group", lazy=True,
        order_by="OptionGroupItem.sort_order", cascade="all, delete-orphan",
    )

    def to_dict(self, admin=False):
        return {
            "id": self.id,
            "name": self.name,
            "min_select": self.min_select,
            "max_select": self.max_select,
            "required": self.min_select > 0,
            "items": [i.to_dict(admin=admin) for i in self.items],
        }


class OptionGroupItem(db.Model):
    """Una opción dentro de un grupo: apunta a un producto (el ingrediente) y puede costar un extra."""
    __tablename__ = "option_group_items"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    group_id = db.Column(db.String(36), db.ForeignKey("option_groups.id"), nullable=False, index=True)
    ingredient_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    extra_price = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    group = db.relationship("OptionGroup", back_populates="items")
    ingredient = db.relationship("Product", foreign_keys=[ingredient_id])

    def is_available(self):
        ing = self.ingredient
        return bool(ing and ing.active and not ing.is_out_of_stock())

    def to_dict(self, admin=False):
        ing = self.ingredient
        data = {
            "id": self.id,
            "ingredient_id": self.ingredient_id,
            "name": ing.name if ing else None,
            "image_url": ing.image_url if ing else None,
            "extra_price": float(self.extra_price or 0),
            "nutrition": ing.nutrition_dict() if ing else None,
            "available": self.is_available(),
        }
        return data


class Locker(db.Model):
    __tablename__ = "lockers"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(300), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    device_id = db.Column(db.String(100), unique=True, nullable=False)  # identifica al ESP32 físico
    # Clave secreta opcional del ESP32. Si está definida, el firmware debe enviarla
    # en la cabecera X-Device-Key. Si es NULL, el locker acepta llamadas sin clave
    # (útil para el prototipo, no recomendado en producción).
    device_key = db.Column(db.String(64), nullable=True)
    last_seen = db.Column(db.DateTime, nullable=True)
    active = db.Column(db.Boolean, default=True)

    boxes = db.relationship(
        "LockerBox", backref="locker", lazy=True, order_by="LockerBox.box_number"
    )

    @staticmethod
    def generate_key():
        return secrets.token_urlsafe(24)

    def is_online(self):
        if not self.last_seen:
            return False
        window = current_app.config.get("DEVICE_ONLINE_SECONDS", 90)
        return datetime.utcnow() - self.last_seen < timedelta(seconds=window)

    def to_dict(self, admin=False):
        data = {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "device_id": self.device_id,
            "active": self.active,
            "online": self.is_online(),
            "boxes_total": len(self.boxes),
            "boxes_libres": len([b for b in self.boxes if b.status == "libre"]),
            "boxes": [
                {"id": b.id, "box_number": b.box_number, "status": b.status}
                for b in self.boxes
            ],
        }
        if admin:
            data["device_key"] = self.device_key
            data["last_seen"] = iso(self.last_seen)
        return data


class LockerBox(db.Model):
    __tablename__ = "locker_boxes"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    locker_id = db.Column(db.String(36), db.ForeignKey("lockers.id"), nullable=False)
    box_number = db.Column(db.Integer, nullable=False)
    # libre | ocupado | mantenimiento (mantenimiento = fuera de servicio o con comida sin retirar)
    status = db.Column(db.String(20), nullable=False, default="libre")

    def to_dict(self):
        return {
            "id": self.id,
            "locker_id": self.locker_id,
            "box_number": self.box_number,
            "status": self.status,
        }


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    locker_id = db.Column(db.String(36), db.ForeignKey("lockers.id"), nullable=False)
    total = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    # pendiente_pago | pagado | retirado | expirado | cancelado
    status = db.Column(db.String(20), nullable=False, default="pendiente_pago")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    paid_at = db.Column(db.DateTime, nullable=True)
    payment_method = db.Column(db.String(30), nullable=True)
    payment_ref = db.Column(db.String(100), nullable=True)

    items = db.relationship("OrderItem", backref="order", lazy=True)
    pickup_code = db.relationship("PickupCode", backref="order", uselist=False, lazy=True)
    user = db.relationship("User")
    locker = db.relationship("Locker")

    def pending_expires_at(self):
        ttl = current_app.config.get("PENDING_ORDER_TTL_MINUTES", 30)
        return self.created_at + timedelta(minutes=ttl)

    def to_dict(self, include_items=True, admin=False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "locker_id": self.locker_id,
            "locker_name": self.locker.name if self.locker else None,
            "locker_address": self.locker.address if self.locker else None,
            "total": float(self.total),
            "status": self.status,
            "created_at": iso(self.created_at),
            "paid_at": iso(self.paid_at),
            "payment_method": self.payment_method,
            "pending_expires_at": iso(self.pending_expires_at())
            if self.status == "pendiente_pago"
            else None,
        }
        if include_items:
            data["items"] = [i.to_dict() for i in self.items]
        if self.pickup_code:
            data["pickup_code"] = self.pickup_code.code
            data["pickup_status"] = self.pickup_code.status
            data["pickup_expires_at"] = iso(self.pickup_code.expires_at)
            data["used_at"] = iso(self.pickup_code.used_at)
            data["box_number"] = self.pickup_code.box.box_number if self.pickup_code.box else None
        if admin:
            data["customer_id"] = self.user_id
            data["customer_name"] = self.user.name if self.user else None
            data["customer_email"] = self.user.email if self.user else None
            data["payment_ref"] = self.payment_ref
        return data


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    # Precio unitario final: incluye los extras de las opciones elegidas
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    # Foto de lo que eligió el cliente (JSON): [{item_id, product_id, name, group, extra_price, calories}]
    selections = db.Column(db.Text, nullable=True)
    # Calorías por unidad (plato + opciones) calculadas al hacer el pedido
    calories = db.Column(db.Integer, nullable=True)

    product = db.relationship("Product")

    def selection_list(self):
        if not self.selections:
            return []
        try:
            data = json.loads(self.selections)
        except ValueError:
            return []
        return data if isinstance(data, list) else []

    def describe(self):
        """Texto corto para correos y reportes: "2 × Bowl (Arroz, Pollo)"."""
        name = self.product.name if self.product else "Producto"
        options = [o.get("name") for o in self.selection_list() if o.get("name")]
        return f"{self.quantity} × {name}" + (f" ({', '.join(options)})" if options else "")

    def to_dict(self):
        return {
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price),
            "options": self.selection_list(),
            "calories": self.calories,
        }


class PickupCode(db.Model):
    __tablename__ = "pickup_codes"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id"), nullable=False)
    box_id = db.Column(db.String(36), db.ForeignKey("locker_boxes.id"), nullable=False)
    code = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="activo")  # activo | usado | expirado
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)

    box = db.relationship("LockerBox")

    @staticmethod
    def generate_code():
        # Código corto, fácil de codificar en un QR y de leer por el escáner UART
        return "MLH-" + secrets.token_hex(5).upper()

    def is_valid(self):
        return self.status == "activo" and datetime.utcnow() < self.expires_at


class AdminKey(db.Model):
    """
    Llave digital (QR) del administrador para abrir una caja y cargar productos.
    Vence en pocos minutos, se puede revocar y queda registrada con quién la creó.
    """
    __tablename__ = "admin_keys"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    locker_id = db.Column(db.String(36), db.ForeignKey("lockers.id"), nullable=False)
    box_id = db.Column(db.String(36), db.ForeignKey("locker_boxes.id"), nullable=False)
    created_by = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="activo")  # activo | usado | revocado
    single_use = db.Column(db.Boolean, nullable=False, default=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    use_count = db.Column(db.Integer, nullable=False, default=0)
    last_used_at = db.Column(db.DateTime, nullable=True)

    box = db.relationship("LockerBox")
    creator = db.relationship("User")

    @staticmethod
    def generate_code():
        # El prefijo MLH-ADM- permite al backend distinguirla de un código de cliente (MLH-)
        return "MLH-ADM-" + secrets.token_hex(5).upper()

    def is_valid(self):
        return self.status == "activo" and datetime.utcnow() < self.expires_at

    def effective_status(self):
        if self.status == "activo" and datetime.utcnow() >= self.expires_at:
            return "expirado"
        return self.status

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "locker_id": self.locker_id,
            "box_id": self.box_id,
            "box_number": self.box.box_number if self.box else None,
            "status": self.effective_status(),
            "single_use": self.single_use,
            "expires_at": iso(self.expires_at),
            "created_at": iso(self.created_at),
            "created_by": self.creator.name if self.creator else None,
            "use_count": self.use_count,
            "last_used_at": iso(self.last_used_at),
        }


class OpenCommand(db.Model):
    """
    Orden de apertura remota: el admin pulsa "Abrir" en el panel y el ESP32 la recoge
    en su siguiente consulta (POST /api/locker/commands). Vence en segundos para que
    una orden vieja nunca abra una caja de forma inesperada.
    """
    __tablename__ = "open_commands"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    locker_id = db.Column(db.String(36), db.ForeignKey("lockers.id"), nullable=False, index=True)
    box_id = db.Column(db.String(36), db.ForeignKey("locker_boxes.id"), nullable=False)
    created_by = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pendiente")  # pendiente | entregado | expirado
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    delivered_at = db.Column(db.DateTime, nullable=True)

    box = db.relationship("LockerBox")
    creator = db.relationship("User")

    def is_pending(self):
        return self.status == "pendiente" and datetime.utcnow() < self.expires_at


class AlertState(db.Model):
    """
    Recuerda qué alertas ya se enviaron (locker sin señal, producto por agotarse) para no
    repetirlas cada minuto. Se borra la fila cuando el problema se resuelve.
    """
    __tablename__ = "alert_states"

    key = db.Column(db.String(120), primary_key=True)
    fired_at = db.Column(db.DateTime, default=datetime.utcnow)


class LockerEvent(db.Model):
    """Bitácora de lo que hace cada locker (accesos, cargas, puerta forzada, etc.)."""
    __tablename__ = "locker_events"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    locker_id = db.Column(db.String(36), db.ForeignKey("lockers.id"), nullable=False, index=True)
    kind = db.Column(db.String(30), nullable=False)
    box_number = db.Column(db.Integer, nullable=True)
    detail = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "kind": self.kind,
            "box_number": self.box_number,
            "detail": self.detail,
            "created_at": iso(self.created_at),
        }


class LoginAttempt(db.Model):
    """
    Intentos fallidos de inicio de sesión por correo (exista o no la cuenta, para no
    revelar qué correos están registrados). Tras varios fallos seguidos se bloquea un rato.
    """
    __tablename__ = "login_attempts"

    key = db.Column(db.String(160), primary_key=True)
    count = db.Column(db.Integer, nullable=False, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
