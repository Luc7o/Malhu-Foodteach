"""
Pruebas de las mejoras del panel de administración: categorías, estados de producto,
pedidos con filtros, clientes, exportar CSV, seguridad (bloqueo, contraseña, 2FA),
estadísticas y bitácora de lockers.   python test_panel_admin.py
"""
import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["LOGIN_MAX_ATTEMPTS"] = "3"
os.environ["ALERT_THREAD"] = "0"

from datetime import datetime, timedelta

import pyotp

from app import create_app
from extensions import db
from models import Locker, LockerBox, LockerEvent, Order, Product, User

app = create_app()
client = app.test_client()


def check(name, cond):
    print(("OK   " if cond else "FALLA"), name)
    if not cond:
        raise SystemExit(1)


def login(email, password, **extra):
    # Los administradores entran por el portal "admin"; los clientes, por la tienda
    portal = "admin" if email.startswith("admin@") else "tienda"
    return client.post("/api/auth/login", json={"email": email, "password": password, "portal": portal, **extra})


def auth(token):
    return {"Authorization": f"Bearer {token}"}


with app.app_context():
    admin = User(name="Admin", email="admin@malhu.com", role="admin")
    admin.set_password("admin1234")
    ana = User(name="Ana Pérez", email="ana@mail.com", role="cliente")
    ana.set_password("secreto123")
    luis = User(name="=Luis", email="luis@mail.com", role="cliente")
    luis.set_password("secreto123")
    locker = Locker(name="Locker Centro", device_id="LOCKER-001", last_seen=datetime.utcnow())
    db.session.add_all([admin, ana, luis, locker])
    db.session.flush()
    for n in (1, 2, 3):
        db.session.add(LockerBox(locker_id=locker.id, box_number=n))
    # producto "viejo" con categoría de texto, como antes de esta versión
    db.session.add(Product(name="Sándwich", price=12.5, stock=10, category="Sándwiches"))
    db.session.commit()
    locker_id = locker.id
    ana_id, luis_id, admin_id = ana.id, luis.id, admin.id

adm = login("admin@malhu.com", "admin1234").get_json()["token"]
tok_ana = login("ana@mail.com", "secreto123").get_json()["token"]
H = auth(adm)

# ---------------------------------------------------------------- categorías
check("cliente no entra a categorías admin", client.get("/api/admin/categories", headers=auth(tok_ana)).status_code == 403)
r = client.post("/api/admin/categories", headers=H, json={"name": "Bebidas"})
check("crear categoría", r.status_code == 201 and r.get_json()["name"] == "Bebidas")
bebidas = r.get_json()["id"]
check("nombre repetido (sin importar mayúsculas)", client.post("/api/admin/categories", headers=H, json={"name": "bebidas"}).status_code == 409)
check("nombre vacío rechazado", client.post("/api/admin/categories", headers=H, json={"name": "  "}).status_code == 400)
postres = client.post("/api/admin/categories", headers=H, json={"name": "Postres"}).get_json()["id"]

# producto con category_id
r = client.post("/api/admin/products", headers=H, json={"name": "Jugo", "price": 5, "stock": 20, "category_id": bebidas})
check("producto con categoría", r.status_code == 201 and r.get_json()["category"] == "Bebidas")
jugo = r.get_json()["id"]
check("categoría inexistente rechazada", client.post("/api/admin/products", headers=H, json={"name": "X", "price": 1, "stock": 1, "category_id": "no-existe"}).status_code == 400)
# compatibilidad: texto libre crea la categoría
r = client.post("/api/admin/products", headers=H, json={"name": "Flan", "price": 6, "stock": 2, "category": "postres"})
check("texto libre reutiliza categoría existente", r.get_json()["category_id"] == postres)
flan = r.get_json()["id"]

pub = client.get("/api/categories").get_json()
check("la tienda solo ve categorías con productos publicados", {c["name"] for c in pub} == {"Bebidas", "Postres"})
adm_cats = client.get("/api/admin/categories", headers=H).get_json()
check("el admin ve el conteo de productos", {c["name"]: c["product_count"] for c in adm_cats}["Bebidas"] == 1)

r = client.put(f"/api/admin/categories/{bebidas}", headers=H, json={"name": "Bebidas frías"})
check("renombrar categoría", r.status_code == 200)
check("los productos muestran el nombre nuevo", client.get(f"/api/products/{jugo}").get_json()["category"] == "Bebidas frías")

r = client.delete(f"/api/admin/categories/{bebidas}", headers=H)
check("no se borra una categoría con productos sin decir qué hacer", r.status_code == 409 and r.get_json()["product_count"] == 1)
r = client.delete(f"/api/admin/categories/{bebidas}?move_to={postres}", headers=H)
check("borrar moviendo los productos", r.status_code == 200 and client.get(f"/api/products/{jugo}").get_json()["category"] == "Postres")

r = client.post("/api/admin/categories/reorder", headers=H, json={"ids": [postres]})
check("reordenar categorías", r.status_code == 200)

# ---------------------------------------------------------------- estados de producto
r = client.put(f"/api/admin/products/{flan}", headers=H, json={"status": "borrador"})
check("pasar a borrador lo oculta de la tienda", r.status_code == 200 and flan not in [p["id"] for p in client.get("/api/products").get_json()])
check("el admin sigue viéndolo", flan in [p["id"] for p in client.get("/api/admin/products", headers=H).get_json()])
check("estado inválido rechazado", client.put(f"/api/admin/products/{flan}", headers=H, json={"status": "otro"}).status_code == 400)
client.put(f"/api/admin/products/{flan}", headers=H, json={"status": "publicado", "featured": True})
lista = client.get("/api/products").get_json()
check("los destacados salen primero", lista[0]["id"] == flan and lista[0]["featured"] is True)

client.put(f"/api/admin/products/{jugo}", headers=H, json={"sold_out": True})
p = client.get(f"/api/products/{jugo}").get_json()
check("agotado a mano: la tienda ve stock 0 y agotado", p["stock"] == 0 and p["sold_out"] is True)
check("agotado a mano: el admin ve el stock real", [x for x in client.get("/api/admin/products", headers=H).get_json() if x["id"] == jugo][0]["stock"] == 20)
r = client.post("/api/orders", headers=auth(tok_ana), json={"locker_id": locker_id, "items": [{"product_id": jugo, "quantity": 1}]})
check("no se puede pedir un producto agotado a mano", r.status_code == 400)
client.put(f"/api/admin/products/{jugo}", headers=H, json={"sold_out": False})

ids = [p["id"] for p in client.get("/api/admin/products", headers=H).get_json()]
ids.reverse()
client.post("/api/admin/products/reorder", headers=H, json={"ids": ids})
orden = [p["id"] for p in client.get("/api/admin/products", headers=H).get_json()]
check("reordenar productos (los destacados siguen primero)", orden[0] == flan and orden[1:] == [i for i in ids if i != flan])

r = client.delete(f"/api/admin/products/{flan}", headers=H)
st = [p for p in client.get("/api/admin/products", headers=H).get_json() if p["id"] == flan][0]
check("archivado deja de estar activo", st["status"] == "archivado" and st["active"] is False)
client.put(f"/api/admin/products/{flan}", headers=H, json={"status": "publicado"})

# ---------------------------------------------------------------- pedidos
sandwich = [p for p in client.get("/api/products").get_json() if p["name"] == "Sándwich"][0]
check("el producto viejo tiene su categoría migrada por texto", sandwich["category"] == "Sándwiches")


def make_order(token, product_id, qty=1):
    o = client.post("/api/orders", headers=auth(token), json={"locker_id": locker_id, "items": [{"product_id": product_id, "quantity": qty}]}).get_json()
    return o["id"]


o1 = make_order(tok_ana, sandwich["id"], 2)
client.post(f"/api/orders/{o1}/pay", headers=auth(tok_ana), json={"method": "yape"})
o2 = make_order(tok_ana, jugo)
tok_luis = login("luis@mail.com", "secreto123").get_json()["token"]
o3 = make_order(tok_luis, jugo)
client.post(f"/api/orders/{o3}/pay", headers=auth(tok_luis), json={})

r = client.get("/api/admin/orders", headers=H).get_json()
check("lista de pedidos paginada", r["total"] == 3 and r["page"] == 1 and len(r["items"]) == 3)
check("resumen con el monto cobrado", r["summary"]["monto"] == 25.0 + 5.0)
r = client.get("/api/admin/orders?per_page=2&page=2", headers=H).get_json()
check("segunda página", len(r["items"]) == 1 and r["pages"] == 2)
check("filtro por estado", client.get("/api/admin/orders?status=pagado", headers=H).get_json()["total"] == 2)
check("búsqueda por cliente", client.get("/api/admin/orders?q=ana", headers=H).get_json()["total"] == 2)
check("búsqueda por id", client.get(f"/api/admin/orders?q={o3[:8]}", headers=H).get_json()["total"] == 1)
check("filtro por locker", client.get(f"/api/admin/orders?locker_id={locker_id}", headers=H).get_json()["total"] == 3)
check("filtro por locker inexistente", client.get("/api/admin/orders?locker_id=x", headers=H).get_json()["total"] == 0)
hoy = (datetime.utcnow() - timedelta(hours=5)).date().isoformat()
check("filtro por fecha (hoy)", client.get(f"/api/admin/orders?date_from={hoy}&date_to={hoy}", headers=H).get_json()["total"] == 3)
check("filtro por fecha (otro día)", client.get("/api/admin/orders?date_from=2020-01-01&date_to=2020-01-02", headers=H).get_json()["total"] == 0)
check("fecha inválida rechazada", client.get("/api/admin/orders?date_from=ayer", headers=H).status_code == 400)
d = client.get(f"/api/admin/orders/{o1}", headers=H).get_json()
check("detalle del pedido", d["customer_email"] == "ana@mail.com" and d["payment_method"] == "yape" and len(d["items"]) == 1 and d.get("payment_ref"))

# ---------------------------------------------------------------- exportar
r = client.get("/api/admin/export/orders", headers=H)
text = r.data.decode("utf-8")
check("CSV de pedidos", r.status_code == 200 and "text/csv" in r.content_type and text.startswith("\ufeffPedido,Fecha"))
check("CSV con los 3 pedidos", len(text.strip().splitlines()) == 4)
r = client.get("/api/admin/export/customers", headers=H)
check("CSV neutraliza fórmulas (=Luis)", "'=Luis" in r.data.decode("utf-8"))
check("CSV de productos", client.get("/api/admin/export/products", headers=H).status_code == 200)
check("el cliente no puede exportar", client.get("/api/admin/export/orders", headers=auth(tok_ana)).status_code == 403)
check("CSV respeta el filtro", len(client.get("/api/admin/export/orders?status=pagado", headers=H).data.decode("utf-8").strip().splitlines()) == 3)

# ---------------------------------------------------------------- clientes
c = client.get("/api/admin/customers", headers=H).get_json()
check("lista de clientes (sin admins)", c["total"] == 2 and all(i["email"] != "admin@malhu.com" for i in c["items"]))
ana_row = [i for i in c["items"] if i["id"] == ana_id][0]
check("clientes con pedidos y gasto", ana_row["orders_count"] == 2 and ana_row["total_spent"] == 25.0)
check("orden por gasto", client.get("/api/admin/customers?sort=gasto", headers=H).get_json()["items"][0]["id"] == ana_id)
check("búsqueda de clientes", client.get("/api/admin/customers?q=luis", headers=H).get_json()["total"] == 1)
det = client.get(f"/api/admin/customers/{ana_id}", headers=H).get_json()
check("detalle del cliente con sus pedidos", det["orders_count"] == 2 and len(det["orders"]) == 2)
check("no se puede abrir un admin como cliente", client.get(f"/api/admin/customers/{admin_id}", headers=H).status_code == 404)

r = client.patch(f"/api/admin/customers/{ana_id}", headers=H, json={"active": False})
check("desactivar cliente", r.status_code == 200 and r.get_json()["active"] is False)
check("su token deja de servir", client.get("/api/orders/my", headers=auth(tok_ana)).status_code == 401)
r = login("ana@mail.com", "secreto123")
check("no puede iniciar sesión", r.status_code == 403)
check("clave mala sigue siendo 401 (no revela la cuenta)", login("ana@mail.com", "mala").status_code == 401)
check("filtro de desactivados", client.get("/api/admin/customers?status=inactivos", headers=H).get_json()["total"] == 1)
client.patch(f"/api/admin/customers/{ana_id}", headers=H, json={"active": True})
check("reactivar cliente", login("ana@mail.com", "secreto123").status_code == 200)

# ---------------------------------------------------------------- estadísticas
s = client.get("/api/admin/stats", headers=H).get_json()
check("stats 7 días", len(s["ventas"]) == 7 and s["granularity"] == "day")
check("KPIs del periodo", s["periodo"]["pedidos"] == 2 and s["periodo"]["ingresos"] == 30.0 and s["periodo"]["ticket_promedio"] == 15.0)
check("ventas por hora", len(s["por_hora"]) == 24 and sum(h["pedidos"] for h in s["por_hora"]) == 2)
check("top productos con ingresos", s["top_productos"][0]["name"] == "Sándwich" and s["top_productos"][0]["ingresos"] == 25.0)
check("ventas por categoría", {c["name"] for c in s["por_categoria"]} == {"Sándwiches", "Postres"})
check("ocupación de lockers", s["lockers"][0]["ocupadas"] == 2 and s["lockers"][0]["online"] is True)
check("stats 30 días por día", len(client.get("/api/admin/stats?range=30", headers=H).get_json()["ventas"]) == 30)
w = client.get("/api/admin/stats?range=90", headers=H).get_json()
check("stats 90 días por semana", w["granularity"] == "week" and 13 <= len(w["ventas"]) <= 14 and sum(v["total"] for v in w["ventas"]) == 30.0)
m = client.get("/api/admin/stats?range=365", headers=H).get_json()
check("stats 365 días por mes", m["granularity"] == "month" and 12 <= len(m["ventas"]) <= 13 and sum(v["total"] for v in m["ventas"]) == 30.0)
check("range inválido usa 7", client.get("/api/admin/stats?range=abc", headers=H).get_json()["range"] == 7)

with app.app_context():
    Product.query.filter_by(id=jugo).update({"stock": 2})
    db.session.commit()
a = client.get("/api/admin/stats", headers=H).get_json()["alertas"]
check("alerta de stock bajo", sorted(x["name"] for x in a["stock_bajo"]) == ["Flan", "Jugo"])
with app.app_context():
    Locker.query.get(locker_id).last_seen = datetime.utcnow() - timedelta(minutes=10)
    db.session.commit()
a = client.get("/api/admin/stats", headers=H).get_json()["alertas"]
check("alerta de locker sin señal", [x["name"] for x in a["lockers_sin_senal"]] == ["Locker Centro"])

# ---------------------------------------------------------------- bitácora de lockers
with app.app_context():
    for i in range(35):
        db.session.add(LockerEvent(locker_id=locker_id, kind="retiro" if i % 2 else "carga", box_number=1))
    db.session.commit()
r = client.get(f"/api/admin/lockers/{locker_id}/events", headers=H).get_json()
check("historial paginado", r["total"] == 35 and len(r["items"]) == 30 and r["pages"] == 2)
check("historial filtrado por tipo", client.get(f"/api/admin/lockers/{locker_id}/events?kind=retiro", headers=H).get_json()["total"] == 17)

from notifications import check_alerts
with app.app_context():
    check_alerts()
    kinds = [e.kind for e in LockerEvent.query.filter_by(locker_id=locker_id).all()]
check("check_alerts deja 'sin_senal' en la bitácora", "sin_senal" in kinds)

# ---------------------------------------------------------------- seguridad
r = client.post("/api/auth/change-password", headers=H, json={"current_password": "mala", "new_password": "nueva12345"})
check("cambiar clave con la actual incorrecta", r.status_code == 400)
check("clave nueva muy corta", client.post("/api/auth/change-password", headers=H, json={"current_password": "admin1234", "new_password": "corta"}).status_code == 400)
check("clave nueva igual a la actual", client.post("/api/auth/change-password", headers=H, json={"current_password": "admin1234", "new_password": "admin1234"}).status_code == 400)
check("cambiar clave", client.post("/api/auth/change-password", headers=H, json={"current_password": "admin1234", "new_password": "nueva12345"}).status_code == 200)
check("la clave vieja ya no sirve", login("admin@malhu.com", "admin1234").status_code == 401)
adm = login("admin@malhu.com", "nueva12345").get_json()["token"]
H = auth(adm)

# bloqueo por intentos fallidos (LOGIN_MAX_ATTEMPTS=3)
for _ in range(2):
    check("intento fallido 401", login("luis@mail.com", "x").status_code == 401)
r = login("luis@mail.com", "x")
check("el 3.º fallo bloquea (429)", r.status_code == 429 and "Espera" in r.get_json()["error"])
check("bloqueado aunque la clave sea correcta", login("luis@mail.com", "secreto123").status_code == 429)
for _ in range(3):
    last = login("nadie@mail.com", "x")
check("correos inexistentes también se bloquean (no revela cuentas)", last.status_code == 429)

# verificación en dos pasos
check("estado 2FA apagado", client.get("/api/admin/security", headers=H).get_json()["totp_enabled"] is False)
r = client.post("/api/admin/security/2fa/setup", headers=H).get_json()
secret = r["secret"]
check("setup devuelve secreto, uri y QR", r["otpauth_uri"].startswith("otpauth://totp/") and r["qr_image_base64"].startswith("data:image/png"))
check("sin confirmar, el login no pide código", "token" in login("admin@malhu.com", "nueva12345").get_json())
check("código malo no activa el 2FA", client.post("/api/admin/security/2fa/enable", headers=H, json={"code": "000000"}).status_code == 400)
check("código correcto activa el 2FA", client.post("/api/admin/security/2fa/enable", headers=H, json={"code": pyotp.TOTP(secret).now()}).status_code == 200)
r = login("admin@malhu.com", "nueva12345").get_json()
check("con 2FA el login pide el código y no da token", r == {"requires_otp": True})
check("código incorrecto en el login", login("admin@malhu.com", "nueva12345", otp="123456").status_code == 401)
r = login("admin@malhu.com", "nueva12345", otp=pyotp.TOTP(secret).now())
check("login con código correcto", r.status_code == 200 and "token" in r.get_json())
tok2 = r.get_json()["token"]
check("no se puede desactivar con clave mala", client.post("/api/admin/security/2fa/disable", headers=auth(tok2), json={"password": "mala", "code": pyotp.TOTP(secret).now()}).status_code == 400)
check("desactivar el 2FA", client.post("/api/admin/security/2fa/disable", headers=auth(tok2), json={"password": "nueva12345", "code": pyotp.TOTP(secret).now()}).status_code == 200)
check("el login vuelve a ser normal", "token" in login("admin@malhu.com", "nueva12345").get_json())

print("\nTodo el panel de administración funciona.")
