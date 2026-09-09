import uuid
import secrets
from datetime import datetime, timedelta

from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db


def gen_uuid():
    return str(uuid.uuid4())


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
    active = db.Column(db.Boolean, default=True)

    boxes = db.relationship("LockerBox", backref="locker", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "device_id": self.device_id,
            "active": self.active,
            "boxes_total": len(self.boxes),
            "boxes_libres": len([b for b in self.boxes if b.status == "libre"]),
        }


class LockerBox(db.Model):
    __tablename__ = "locker_boxes"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    locker_id = db.Column(db.String(36), db.ForeignKey("lockers.id"), nullable=False)
    box_number = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="libre")  # libre | ocupado

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

    items = db.relationship("OrderItem", backref="order", lazy=True)
    pickup_code = db.relationship("PickupCode", backref="order", uselist=False, lazy=True)

    def to_dict(self, include_items=True):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "locker_id": self.locker_id,
            "total": float(self.total),
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }
        if include_items:
            data["items"] = [i.to_dict() for i in self.items]
        if self.pickup_code:
            data["pickup_code"] = self.pickup_code.code
            data["box_number"] = self.pickup_code.box.box_number if self.pickup_code.box else None
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
