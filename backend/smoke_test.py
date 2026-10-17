"""
Prueba de humo del flujo completo, sobre una base SQLite en memoria (no toca tu MySQL).
    python smoke_test.py
"""
import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["PENDING_ORDER_TTL_MINUTES"] = "30"

from datetime import datetime, timedelta

from app import create_app
from extensions import db
from models import User, Product, Locker, LockerBox, PickupCode, Order
from services import expire_stale

app = create_app()
client = app.test_client()


def check(name, cond):
    print(("OK   " if cond else "FALLA"), name)
    if not cond:
        raise SystemExit(1)


with app.app_context():
    admin = User(name="Admin", email="admin@malhu.com", role="admin")
    admin.set_password("admin123")
    db.session.add(admin)
    locker = Locker(name="Locker Test", device_id="LOCKER-001")
    db.session.add(locker)
    db.session.flush()
    for n in range(1, 4):
        db.session.add(LockerBox(locker_id=locker.id, box_number=n))
    p = Product(name="Sándwich", price=12.5, stock=5, category="Sándwiches")
    db.session.add(p)
    db.session.commit()
    locker_id, product_id = locker.id, p.id


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# --- registro / login ---
r = client.post("/api/auth/register", json={"name": "Ana", "email": "Ana@Mail.com", "password": "123456"})
check("registro", r.status_code == 201)
ana = r.get_json()["token"]
check("email duplicado (mayúsculas) rechazado",
      client.post("/api/auth/register", json={"name": "X", "email": "ana@mail.com", "password": "123456"}).status_code == 409)
check("contraseña corta rechazada",
      client.post("/api/auth/register", json={"name": "X", "email": "x@mail.com", "password": "123"}).status_code == 400)
adm = client.post("/api/auth/login", json={"email": "admin@malhu.com", "password": "admin123", "portal": "admin"}).get_json()["token"]

# --- pedido ---
r = client.post("/api/orders", headers=auth(ana), json={"locker_id": locker_id, "items": [{"product_id": product_id, "quantity": 2}]})
check("crear pedido", r.status_code == 201)
order = r.get_json()
check("total correcto (25.00)", order["total"] == 25.0)
check("fecha con sufijo Z", order["created_at"].endswith("Z"))
check("pendiente con vencimiento", order["pending_expires_at"] is not None)

check("cantidad inválida rechazada",
      client.post("/api/orders", headers=auth(ana), json={"locker_id": locker_id, "items": [{"product_id": product_id, "quantity": 0}]}).status_code == 400)
check("stock insuficiente rechazado",
      client.post("/api/orders", headers=auth(ana), json={"locker_id": locker_id, "items": [{"product_id": product_id, "quantity": 99}]}).status_code == 400)

# --- pago ---
check("método inválido rechazado",
      client.post(f"/api/orders/{order['id']}/pay", headers=auth(ana), json={"method": "bitcoin"}).status_code == 400)
r = client.post(f"/api/orders/{order['id']}/pay", headers=auth(ana), json={"method": "yape"})
paid = r.get_json()
check("pago simulado", r.status_code == 200 and paid["status"] == "pagado")
check("caja asignada", paid["box_number"] == 1)
check("método guardado", paid["payment_method"] == "yape")
check("doble pago rechazado", client.post(f"/api/orders/{order['id']}/pay", headers=auth(ana)).status_code == 400)

with app.app_context():
    check("stock descontado", db.session.get(Product, product_id).stock == 3)

qr = client.get(f"/api/orders/{order['id']}/qr", headers=auth(ana)).get_json()
check("QR generado", qr["qr_image_base64"].startswith("data:image/png;base64,") and qr["code"].startswith("MLH-"))

# --- autorización ---
otro = client.post("/api/auth/register", json={"name": "Bob", "email": "bob@mail.com", "password": "123456"}).get_json()["token"]
check("otro cliente no ve el pedido", client.get(f"/api/orders/{order['id']}", headers=auth(otro)).status_code == 403)
check("admin sí ve el pedido", client.get(f"/api/orders/{order['id']}", headers=auth(adm)).status_code == 200)
check("cliente no entra a /admin", client.get("/api/admin/stats", headers=auth(ana)).status_code == 403)

# --- ESP32 ---
code = qr["code"]
check("locker desconocido", client.post("/api/locker/validate", json={"device_id": "NOPE", "code": code}).status_code == 404)
check("código inexistente", client.post("/api/locker/validate", json={"device_id": "LOCKER-001", "code": "MLH-XXXX"}).status_code == 404)

# clave de dispositivo
key = client.post(f"/api/admin/lockers/{locker_id}/rotate-key", headers=auth(adm)).get_json()["device_key"]
check("clave generada", bool(key))
check("sin clave -> 401", client.post("/api/locker/validate", json={"device_id": "LOCKER-001", "code": code}).status_code == 401)
check("clave errónea -> 401", client.post("/api/locker/validate", json={"device_id": "LOCKER-001", "code": code}, headers={"X-Device-Key": "mala"}).status_code == 401)
check("heartbeat", client.post("/api/locker/heartbeat", json={"device_id": "LOCKER-001"}, headers={"X-Device-Key": key}).status_code == 200)
lk = client.get("/api/lockers").get_json()[0]
check("locker en línea tras heartbeat", lk["online"] is True)
check("la clave NO se expone en la API pública", "device_key" not in lk)

r = client.post("/api/locker/validate", json={"device_id": "LOCKER-001", "code": code}, headers={"X-Device-Key": key})
check("validación correcta", r.status_code == 200 and r.get_json()["valid"] and r.get_json()["box_number"] == 1)
check("reuso del código rechazado", client.post("/api/locker/validate", json={"device_id": "LOCKER-001", "code": code}, headers={"X-Device-Key": key}).status_code == 410)
check("pedido retirado", client.get(f"/api/orders/{order['id']}", headers=auth(ana)).get_json()["status"] == "retirado")

# --- expiración de código: caja -> mantenimiento ---
o2 = client.post("/api/orders", headers=auth(ana), json={"locker_id": locker_id, "items": [{"product_id": product_id, "quantity": 1}]}).get_json()
client.post(f"/api/orders/{o2['id']}/pay", headers=auth(ana), json={"method": "tarjeta"})
with app.app_context():
    pc = PickupCode.query.filter_by(order_id=o2["id"]).first()
    pc.expires_at = datetime.utcnow() - timedelta(minutes=1)
    box_id = pc.box_id
    db.session.commit()
    expire_stale()
    check("pedido expirado", db.session.get(Order, o2["id"]).status == "expirado")
    check("caja en mantenimiento (hay comida adentro)", db.session.get(LockerBox, box_id).status == "mantenimiento")
r = client.patch(f"/api/admin/boxes/{box_id}", headers=auth(adm), json={"status": "libre"})
check("admin libera la caja", r.status_code == 200 and r.get_json()["status"] == "libre")

# --- cancelación ---
o3 = client.post("/api/orders", headers=auth(ana), json={"locker_id": locker_id, "items": [{"product_id": product_id, "quantity": 1}]}).get_json()
check("cliente cancela pendiente", client.post(f"/api/orders/{o3['id']}/cancel", headers=auth(ana)).get_json()["status"] == "cancelado")

o4 = client.post("/api/orders", headers=auth(ana), json={"locker_id": locker_id, "items": [{"product_id": product_id, "quantity": 1}]}).get_json()
client.post(f"/api/orders/{o4['id']}/pay", headers=auth(ana), json={"method": "plin"})
with app.app_context():
    stock_before = db.session.get(Product, product_id).stock
r = client.post(f"/api/admin/orders/{o4['id']}/cancel", headers=auth(adm))
check("admin cancela pedido pagado", r.status_code == 200 and r.get_json()["status"] == "cancelado")
with app.app_context():
    check("stock devuelto", db.session.get(Product, product_id).stock == stock_before + 1)
    check("caja liberada", all(b.status == "libre" for b in Locker.query.first().boxes))

# --- pedidos sin pagar vencen ---
o5 = client.post("/api/orders", headers=auth(ana), json={"locker_id": locker_id, "items": [{"product_id": product_id, "quantity": 1}]}).get_json()
with app.app_context():
    db.session.get(Order, o5["id"]).created_at = datetime.utcnow() - timedelta(minutes=45)
    db.session.commit()
    expire_stale()
    check("pedido sin pagar se cancela solo", db.session.get(Order, o5["id"]).status == "cancelado")

# --- admin ---
s = client.get("/api/admin/stats", headers=auth(adm)).get_json()
check("stats con 7 días de ventas", len(s["ventas"]) == 7)
check("stats con top productos", s["top_productos"][0]["name"] == "Sándwich")
lk_admin = client.get("/api/admin/lockers", headers=auth(adm)).get_json()[0]
check("admin ve device_key y cajas", lk_admin["device_key"] == key and len(lk_admin["boxes"]) == 3)
r = client.post("/api/admin/lockers", headers=auth(adm), json={"name": "Nuevo", "device_id": "LOCKER-002", "num_boxes": 6})
check("crear locker con 6 cajas", r.status_code == 201 and len(r.get_json()["boxes"]) == 6)
check("device_id duplicado rechazado", client.post("/api/admin/lockers", headers=auth(adm), json={"name": "X", "device_id": "LOCKER-002"}).status_code == 409)
r = client.post("/api/admin/products", headers=auth(adm), json={"name": "Té", "price": "abc", "stock": 1})
check("precio inválido rechazado", r.status_code == 400)

print("\nTodo el flujo funciona.")
