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


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(60), nullable=True)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)
    image_url = db.Column(db.String(500), nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "price": float(self.price),
            "stock": self.stock,
            "image_url": self.image_url,
            "active": self.active,
        }


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
            data["customer_name"] = self.user.name if self.user else None
            data["customer_email"] = self.user.email if self.user else None
        return data


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)

    product = db.relationship("Product")

    def to_dict(self):
        return {
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price),
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
