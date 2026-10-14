"""
Prueba del botón "Abrir" (apertura remota). Usa SQLite en memoria, no toca tu MySQL.
    python test_apertura_remota.py
"""
import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["UPLOAD_FOLDER"] = tempfile.mkdtemp(prefix="malhu_uploads_")

from datetime import datetime, timedelta

from app import create_app
from extensions import db
from models import Locker, LockerBox, LockerEvent, OpenCommand, User

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
    locker = Locker(name="Locker A", device_id="LOCKER-001", device_key="clave-secreta")
    db.session.add(locker)
    db.session.flush()
    for n in range(1, 4):
        db.session.add(LockerBox(locker_id=locker.id, box_number=n))
    db.session.commit()
    locker_id = locker.id

adm = client.post("/api/auth/login", json={"email": "admin@malhu.com", "password": "admin123"}).get_json()["token"]
ana = client.post("/api/auth/register", json={"name": "Ana", "email": "ana@mail.com", "password": "123456"}).get_json()["token"]
H = lambda t: {"Authorization": f"Bearer {t}"}
DEV = {"X-Device-Key": "clave-secreta"}
URL = f"/api/admin/lockers/{locker_id}/boxes/2/open"

check("Cliente no puede abrir cajas", client.post(URL, headers=H(ana)).status_code == 403)
check("Sin señal del locker -> 503", client.post(URL, headers=H(adm)).status_code == 503)

client.post("/api/locker/heartbeat", json={"device_id": "LOCKER-001"}, headers=DEV)
r = client.post(URL, headers=H(adm))
check("Admin crea la orden (202)", r.status_code == 202)
cmd_id = r.get_json()["id"]
check("Doble clic reutiliza la orden", client.post(URL, headers=H(adm)).get_json()["id"] == cmd_id)
check("Caja inexistente -> 404", client.post(f"/api/admin/lockers/{locker_id}/boxes/9/open", headers=H(adm)).status_code == 404)

check("ESP32 sin clave -> 401", client.post("/api/locker/commands", json={"device_id": "LOCKER-001"}).status_code == 401)
c = client.post("/api/locker/commands", json={"device_id": "LOCKER-001"}, headers=DEV).get_json()["commands"]
check("ESP32 recibe 1 orden: abrir caja 2 en modo carga",
      len(c) == 1 and c[0]["box_number"] == 2 and c[0]["action"] == "open" and c[0]["mode"] == "carga")
check("La orden se entrega una sola vez",
      client.post("/api/locker/commands", json={"device_id": "LOCKER-001"}, headers=DEV).get_json()["commands"] == [])

with app.app_context():
    ev = LockerEvent.query.filter_by(locker_id=locker_id, kind="carga").first()
    check("Queda en la bitácora con el nombre del admin", ev and "Admin" in ev.detail and ev.box_number == 2)

# Orden vencida: no se entrega
client.post(f"/api/admin/lockers/{locker_id}/boxes/3/open", headers=H(adm))
with app.app_context():
    old = OpenCommand.query.filter_by(status="pendiente").first()
    old.expires_at = datetime.utcnow() - timedelta(seconds=1)
    db.session.commit()
check("Una orden vencida no se entrega",
      client.post("/api/locker/commands", json={"device_id": "LOCKER-001"}, headers=DEV).get_json()["commands"] == [])
print("\nTodo bien.")
