"""
Cada cuenta entra solo por su portal: los administradores por el panel y los clientes por la tienda.
    python test_portales.py
"""
import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["LOGIN_MAX_ATTEMPTS"] = "3"
os.environ["ALERT_THREAD"] = "0"

import pyotp

from app import create_app
from extensions import db
from models import User

app = create_app()
client = app.test_client()


def check(name, cond):
    print(("OK   " if cond else "FALLA"), name)
    if not cond:
        raise SystemExit(1)


def login(email, password, portal=None, **extra):
    body = {"email": email, "password": password, **extra}
    if portal is not None:
        body["portal"] = portal
    return client.post("/api/auth/login", json=body)


with app.app_context():
    admin = User(name="Admin", email="admin@malhu.com", role="admin")
    admin.set_password("admin1234")
    ana = User(name="Ana", email="ana@mail.com", role="cliente")
    ana.set_password("secreto123")
    db.session.add_all([admin, ana])
    db.session.commit()

# ---------------------------------------------------------------- administrador
r = login("admin@malhu.com", "admin1234", "tienda")
check("admin en la tienda: 403 y sin token", r.status_code == 403 and "token" not in r.get_json())
check("el mensaje manda al panel", "panel de administración" in r.get_json()["error"])
r = login("admin@malhu.com", "admin1234")
check("admin sin indicar portal cuenta como tienda: 403 y sin token", r.status_code == 403 and "token" not in r.get_json())
check("portal desconocido cuenta como tienda", login("admin@malhu.com", "admin1234", "otro").status_code == 403)
r = login("admin@malhu.com", "admin1234", "admin")
check("admin en el panel: entra", r.status_code == 200 and r.get_json()["user"]["role"] == "admin" and "token" in r.get_json())
check("contraseña mala en la tienda sigue siendo 401 (no revela que es admin)", login("admin@malhu.com", "mala", "tienda").status_code == 401)
check("contraseña mala en el panel sigue siendo 401", login("admin@malhu.com", "mala", "admin").status_code == 401)

# ---------------------------------------------------------------- cliente
r = login("ana@mail.com", "secreto123", "tienda")
check("cliente en la tienda: entra", r.status_code == 200 and r.get_json()["user"]["role"] == "cliente")
check("cliente sin indicar portal: entra (tienda)", login("ana@mail.com", "secreto123").status_code == 200)
r = login("ana@mail.com", "secreto123", "admin")
check("cliente en el panel: 403 y sin token", r.status_code == 403 and "token" not in r.get_json())
check("el mensaje dice que no tiene acceso", "no tiene acceso" in r.get_json()["error"])

# ---------------------------------------------------------------- dos pasos
tok = login("admin@malhu.com", "admin1234", "admin").get_json()["token"]
H = {"Authorization": f"Bearer {tok}"}
secret = client.post("/api/admin/security/2fa/setup", headers=H).get_json()["secret"]
client.post("/api/admin/security/2fa/enable", headers=H, json={"code": pyotp.TOTP(secret).now()})
r = login("admin@malhu.com", "admin1234", "tienda")
check("admin con 2FA en la tienda: 403 directo, sin pedir código", r.status_code == 403 and "requires_otp" not in r.get_json())
check("admin con 2FA en el panel: pide el código", login("admin@malhu.com", "admin1234", "admin").get_json() == {"requires_otp": True})
r = login("admin@malhu.com", "admin1234", "admin", otp=pyotp.TOTP(secret).now())
check("admin con 2FA y código: entra", r.status_code == 200 and "token" in r.get_json())

# ---------------------------------------------------------------- el bloqueo por intentos no se confunde con esto
for _ in range(3):
    last = login("ana@mail.com", "mala", "tienda")
check("el bloqueo por intentos fallidos sigue funcionando", last.status_code == 429)
check("los rechazos por portal no cuentan como intentos fallidos", [login("admin@malhu.com", "admin1234", "tienda").status_code for _ in range(6)] == [403] * 6)
check("y el admin puede entrar por su panel después", login("admin@malhu.com", "admin1234", "admin", otp=pyotp.TOTP(secret).now()).status_code == 200)

print("\nCada cuenta entra solo por su portal.")
