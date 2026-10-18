"""
Prueba de la compra como invitado (sin registro), sobre SQLite en memoria.
    python test_invitado.py
"""
import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["PAYMENT_PROVIDER"] = "simulated"

from app import create_app
from extensions import db
from models import GuestContact, Locker, LockerBox, Order, Product, User

app = create_app()
client = app.test_client()


def check(name, cond):
    print(("OK   " if cond else "FALLA"), name)
    if not cond:
        raise SystemExit(1)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


with app.app_context():
    admin = User(name="Admin", email="admin@malhu.com", role="admin")
    admin.set_password("admin123")
    db.session.add(admin)
    locker = Locker(name="Locker Test", device_id="LOCKER-001")
    db.session.add(locker)
    db.session.flush()
    for n in range(1, 4):
        db.session.add(LockerBox(locker_id=locker.id, box_number=n))
    p = Product(name="Smoothie", price=10, stock=5, category="Bebidas")
    db.session.add(p)
    cliente = User(name="Ana", email="ana@mail.com", role="cliente")
    cliente.set_password("123456")
    db.session.add(cliente)
    db.session.commit()
    locker_id, product_id = locker.id, p.id

# --- validaciones ---
check("sin nombre se rechaza", client.post("/api/auth/guest", json={"email": "a@b.com"}).status_code == 400)
check("correo inválido se rechaza", client.post("/api/auth/guest", json={"name": "Lucio", "email": "xx"}).status_code == 400)
r = client.post("/api/auth/guest", json={"name": "Lucio", "email": "ANA@mail.com"})
check("correo de una cuenta existente pide iniciar sesión (409)", r.status_code == 409)

# --- invitado ---
r = client.post("/api/auth/guest", json={"name": "Lucio", "email": "Lucio@Mail.com"})
check("sesión de invitado creada", r.status_code == 201)
data = r.get_json()
tok = data["token"]
check("el usuario devuelve el correo real", data["user"]["email"] == "lucio@mail.com")
check("rol invitado", data["user"]["role"] == "invitado")

r = client.post("/api/auth/guest", json={"name": "Otro", "email": "lucio@mail.com"})
check("el mismo correo da otra sesión independiente", r.status_code == 201 and r.get_json()["user"]["id"] != data["user"]["id"])
tok_otro = r.get_json()["token"]

r = client.post("/api/orders", headers=auth(tok), json={"locker_id": locker_id, "items": [{"product_id": product_id, "quantity": 1}]})
check("el invitado crea pedido", r.status_code == 201)
oid = r.get_json()["id"]
check("el invitado no puede iniciar sesión", client.post("/api/auth/login", json={"email": "lucio@mail.com", "password": "x"}).status_code == 401)

check("otro invitado con el mismo correo NO ve ese pedido",
      client.get(f"/api/orders/{oid}", headers=auth(tok_otro)).status_code == 403)
check("la lista de pedidos de otro invitado está vacía", client.get("/api/orders/my", headers=auth(tok_otro)).get_json() == [])

r = client.post(f"/api/orders/{oid}/pay", headers=auth(tok), json={"method": "yape"})
check("el invitado paga", r.status_code == 200 and r.get_json()["status"] == "pagado")
check("el invitado ve su QR", client.get(f"/api/orders/{oid}/qr", headers=auth(tok)).status_code == 200)
check("mis pedidos del invitado", len(client.get("/api/orders/my", headers=auth(tok)).get_json()) == 1)

# --- admin ---
adm = client.post("/api/auth/login", json={"email": "admin@malhu.com", "password": "admin123", "portal": "admin"}).get_json()["token"]
orders = client.get("/api/admin/orders", headers=auth(adm)).get_json()
rows = orders["items"] if isinstance(orders, dict) and "items" in orders else orders
check("admin ve el pedido con el correo real e (invitado)",
      any(o["customer_email"] == "lucio@mail.com" and "(invitado)" in o["customer_name"] for o in rows))
r = client.get("/api/admin/orders?q=lucio@mail", headers=auth(adm)).get_json()
rows = r["items"] if isinstance(r, dict) and "items" in r else r
check("admin busca pedidos por el correo real del invitado", len(rows) == 1)
cust = client.get("/api/admin/customers", headers=auth(adm)).get_json()
crows = cust["items"] if isinstance(cust, dict) and "items" in cust else cust
check("los invitados no aparecen como clientes", all(c["email"] != "lucio@mail.com" for c in crows))
print("\nTodo bien.")
