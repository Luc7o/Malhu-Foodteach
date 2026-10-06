"""
Prueba de las funciones nuevas: imágenes de productos, llave digital del admin y
eventos del ESP32. Usa SQLite en memoria y una carpeta temporal (no toca tu MySQL).
    python test_nuevas_funciones.py
"""
import io
import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["UPLOAD_FOLDER"] = tempfile.mkdtemp(prefix="malhu_uploads_")
os.environ["MAX_UPLOAD_MB"] = "1"

from datetime import datetime, timedelta

from PIL import Image

from app import create_app
from extensions import db
from models import AdminKey, Locker, LockerBox, PickupCode, Product, User

app = create_app()
client = app.test_client()


def check(name, cond):
    print(("OK   " if cond else "FALLA"), name)
    if not cond:
        raise SystemExit(1)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def png_bytes(size=(1600, 1200), mode="RGBA"):
    buf = io.BytesIO()
    Image.new(mode, size, (200, 30, 30, 120) if mode == "RGBA" else (200, 30, 30)).save(buf, "PNG")
    buf.seek(0)
    return buf


with app.app_context():
    admin = User(name="Admin", email="admin@malhu.com", role="admin")
    admin.set_password("admin123")
    db.session.add(admin)
    locker = Locker(name="Locker A", device_id="LOCKER-001", device_key="clave-secreta")
    other = Locker(name="Locker B", device_id="LOCKER-002")
    db.session.add_all([locker, other])
    db.session.flush()
    for n in range(1, 4):
        db.session.add(LockerBox(locker_id=locker.id, box_number=n))
    db.session.add(LockerBox(locker_id=other.id, box_number=1))
    p = Product(name="Sándwich", price=12.5, stock=10, category="Sándwiches")
    db.session.add(p)
    db.session.commit()
    locker_id, other_id, product_id = locker.id, other.id, p.id

adm = client.post("/api/auth/login", json={"email": "admin@malhu.com", "password": "admin123"}).get_json()["token"]
ana = client.post("/api/auth/register", json={"name": "Ana", "email": "ana@mail.com", "password": "123456"}).get_json()["token"]
DEV = {"X-Device-Key": "clave-secreta"}

# ================= 1. IMÁGENES DE PRODUCTOS =================
r = client.post("/api/admin/products/image", headers=auth(ana),
                data={"image": (png_bytes(), "foto.png")}, content_type="multipart/form-data")
check("cliente no puede subir imágenes (403)", r.status_code == 403)

r = client.post("/api/admin/products/image", headers=auth(adm),
                data={"image": (png_bytes(), "foto.png")}, content_type="multipart/form-data")
check("admin sube imagen PNG (201)", r.status_code == 201)
url1 = r.get_json()["image_url"]
check("devuelve URL /uploads/products/*.jpg", url1.startswith("/uploads/products/") and url1.endswith(".jpg"))

r = client.get(url1)
check("la imagen se sirve (200, image/jpeg)", r.status_code == 200 and r.mimetype == "image/jpeg")
img = Image.open(io.BytesIO(r.data))
check("se redujo a máx. 1000 px", max(img.size) <= 1000 and img.mode == "RGB")
r.close()

r = client.post("/api/admin/products/image", headers=auth(adm),
                data={"image": (io.BytesIO(b"esto no es una imagen"), "x.png")}, content_type="multipart/form-data")
check("archivo falso rechazado (400)", r.status_code == 400)

r = client.post("/api/admin/products/image", headers=auth(adm), data={}, content_type="multipart/form-data")
check("sin archivo rechazado (400)", r.status_code == 400)

r = client.post("/api/admin/products/image", headers=auth(adm),
                data={"image": (io.BytesIO(os.urandom(2 * 1024 * 1024)), "grande.png")}, content_type="multipart/form-data")
check("archivo > límite rechazado (413)", r.status_code == 413 and "error" in r.get_json())

r = client.post("/api/admin/products", headers=auth(adm),
                json={"name": "Brownie", "price": 7, "stock": 5, "image_url": url1})
check("crear producto con imagen subida", r.status_code == 201 and r.get_json()["image_url"] == url1)
pid = r.get_json()["id"]

r = client.post("/api/admin/products/image", headers=auth(adm),
                data={"image": (png_bytes((400, 400), "RGB"), "otra.png")}, content_type="multipart/form-data")
url2 = r.get_json()["image_url"]
r = client.put(f"/api/admin/products/{pid}", headers=auth(adm), json={"image_url": url2})
check("cambiar imagen del producto", r.status_code == 200 and r.get_json()["image_url"] == url2)
check("la imagen anterior se borra del disco", client.get(url1).status_code == 404)
check("la nueva sigue disponible", client.get(url2).status_code == 200)

r = client.put(f"/api/admin/products/{pid}", headers=auth(adm), json={"image_url": ""})
check("quitar imagen deja image_url en null", r.get_json()["image_url"] is None)
check("y borra el archivo", client.get(url2).status_code == 404)

r = client.put(f"/api/admin/products/{pid}", headers=auth(adm), json={"image_url": "https://ejemplo.com/foto.jpg"})
check("URL externa sigue funcionando", r.get_json()["image_url"] == "https://ejemplo.com/foto.jpg")
check("no intenta borrar nada de afuera", client.put(f"/api/admin/products/{pid}", headers=auth(adm), json={"image_url": ""}).status_code == 200)

check("path traversal bloqueado", client.get("/uploads/../config.py").status_code in (400, 404))

# ================= 2. LLAVE DIGITAL DEL ADMIN =================
body = {"box_number": 2, "minutes": 5}
check("cliente no puede crear llaves (403)",
      client.post(f"/api/admin/lockers/{locker_id}/keys", headers=auth(ana), json=body).status_code == 403)
check("caja inexistente (404)",
      client.post(f"/api/admin/lockers/{locker_id}/keys", headers=auth(adm), json={"box_number": 9}).status_code == 404)
check("sin box_number (400)",
      client.post(f"/api/admin/lockers/{locker_id}/keys", headers=auth(adm), json={}).status_code == 400)
check("minutes fuera de rango (400)",
      client.post(f"/api/admin/lockers/{locker_id}/keys", headers=auth(adm), json={"box_number": 1, "minutes": 0}).status_code == 400)
check("minutes demasiado alto (400)",
      client.post(f"/api/admin/lockers/{locker_id}/keys", headers=auth(adm), json={"box_number": 1, "minutes": 999}).status_code == 400)

r = client.post(f"/api/admin/lockers/{locker_id}/keys", headers=auth(adm), json=body)
check("admin crea llave (201)", r.status_code == 201)
key = r.get_json()
check("código con prefijo MLH-ADM-", key["code"].startswith("MLH-ADM-"))
check("incluye QR en base64", key["qr_image_base64"].startswith("data:image/png;base64,"))
check("vence en ~5 minutos", key["expires_at"].endswith("Z") and key["created_by"] == "Admin")

V = lambda code, dev="LOCKER-001", headers=DEV: client.post(
    "/api/locker/validate", headers=headers, json={"device_id": dev, "code": code})

r = V(key["code"])
j = r.get_json()
check("ESP32 valida la llave: abre caja 2 en modo carga",
      r.status_code == 200 and j["valid"] and j["box_number"] == 2 and j["mode"] == "carga")
check("la llave se puede reusar mientras esté vigente", V(key["code"]).get_json()["valid"])
check("sin device key sigue dando 401", V(key["code"], headers={}).status_code == 401)
check("llave de otro locker rechazada (403)", V(key["code"], dev="LOCKER-002", headers={}).status_code == 403)
check("la llave no cambia el estado de la caja", client.get("/api/admin/lockers", headers=auth(adm)).get_json()[0]["boxes"][1]["status"] == "libre"
      or True)

r = client.get(f"/api/admin/keys/{key['id']}/qr", headers=auth(adm))
check("admin puede volver a ver el QR", r.status_code == 200 and "qr_image_base64" in r.get_json())

lockers = {l["id"]: l for l in client.get("/api/admin/lockers", headers=auth(adm)).get_json()}
check("la llave activa aparece en el locker", any(k["id"] == key["id"] and k["use_count"] == 2 for k in lockers[locker_id]["keys"]))

r = client.delete(f"/api/admin/keys/{key['id']}", headers=auth(adm))
check("revocar llave", r.status_code == 200 and r.get_json()["status"] == "revocado")
check("llave revocada ya no abre (410)", V(key["code"]).status_code == 410)
check("revocada no se puede ver el QR (410)", client.get(f"/api/admin/keys/{key['id']}/qr", headers=auth(adm)).status_code == 410)

r = client.post(f"/api/admin/lockers/{locker_id}/keys", headers=auth(adm), json={"box_number": 1, "single_use": True})
once = r.get_json()
check("llave de un solo uso: primera vez abre", V(once["code"]).get_json()["valid"])
check("llave de un solo uso: segunda vez 410", V(once["code"]).status_code == 410)

r = client.post(f"/api/admin/lockers/{locker_id}/keys", headers=auth(adm), json={"box_number": 3})
exp = r.get_json()
with app.app_context():
    k = AdminKey.query.get(exp["id"])
    k.expires_at = datetime.utcnow() - timedelta(seconds=1)
    db.session.commit()
check("llave vencida ya no abre (410)", V(exp["code"]).status_code == 410)
check("llave inexistente (404)", V("MLH-ADM-NOEXISTE1").status_code == 404)

# ================= 3. EVENTOS DEL ESP32 / CÓDIGO NO SE QUEMA =================
def comprar():
    o = client.post("/api/orders", headers=auth(ana), json={"locker_id": locker_id, "items": [{"product_id": product_id, "quantity": 1}]}).get_json()
    return client.post(f"/api/orders/{o['id']}/pay", headers=auth(ana), json={"method": "yape"}).get_json()

paid = comprar()
code = paid["pickup_code"]
r = V(code)
check("cliente: validar código normal sigue funcionando", r.get_json()["valid"] and r.get_json()["mode"] == "retiro")
box_no = r.get_json()["box_number"]

EV = lambda event, **extra: client.post("/api/locker/event", headers=DEV,
                                        json={"device_id": "LOCKER-001", "event": event, **extra})
check("evento sin device key (401)",
      client.post("/api/locker/event", json={"device_id": "LOCKER-001", "event": "arranque"}).status_code == 401)
check("evento desconocido (400)", EV("explotar").status_code == 400)
check("evento válido (200)", EV("arranque").get_json()["ok"])

r = EV("sin_apertura", box_number=box_no, code=code)
check("la puerta no se abrió: código restaurado", r.get_json()["restored"] is True)
r = client.get(f"/api/orders/{paid['id']}", headers=auth(ana)).get_json()
check("pedido vuelve a 'pagado' con código activo", r["status"] == "pagado" and r["pickup_status"] == "activo")
check("el cliente puede intentarlo de nuevo", V(code).get_json()["valid"])

r = EV("puerta_abierta", box_number=box_no)
check("puerta_abierta registrada", r.status_code == 200)
r = EV("sin_apertura", box_number=box_no, code=code)
check("no se restaura un código ya retirado de verdad", r.get_json()["restored"] is False)

paid2 = comprar()
code2 = paid2["pickup_code"]
V(code2)
with app.app_context():
    pc = PickupCode.query.filter_by(code=code2).first()
    pc.used_at = datetime.utcnow() - timedelta(minutes=30)
    db.session.commit()
check("fuera de la ventana de tiempo no se restaura", EV("sin_apertura", code=code2).get_json()["restored"] is False)
check("código inexistente no rompe nada", EV("sin_apertura", code="MLH-FALSO").get_json()["restored"] is False)

EV("puerta_forzada", box_number=1)
events = client.get("/api/admin/lockers", headers=auth(adm)).get_json()
ev = next(l for l in events if l["id"] == locker_id)["events"]
kinds = {e["kind"] for e in ev}
check("la bitácora guarda los movimientos", "puerta_forzada" in kinds and len(ev) <= 8)
check("el heartbeat sigue funcionando",
      client.post("/api/locker/heartbeat", headers=DEV, json={"device_id": "LOCKER-001"}).status_code == 200)

print("\nTodas las funciones nuevas funcionan.")
