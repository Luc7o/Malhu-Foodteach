"""
Pruebas del pago con Culqi. No usa internet ni tu MySQL: simula las respuestas de Culqi
y captura los correos.
    python test_culqi.py
"""
import os
import tempfile

os.environ.update({
    "DATABASE_URL": "sqlite:///:memory:",
    "UPLOAD_FOLDER": tempfile.mkdtemp(prefix="malhu_uploads_"),
    "PAYMENT_PROVIDER": "culqi",
    "CULQI_PUBLIC_KEY": "pk_test_abc123",
    "CULQI_SECRET_KEY": "sk_test_xyz789",
    "MAIL_SERVER": "smtp.prueba.local",
    "MAIL_FROM": "malhu@prueba.local",
    "ADMIN_ALERT_EMAILS": "dueno@malhu.test",
    "NOTIFICATIONS_SYNC": "1",
    "ALERT_THREAD": "0",
    "LOW_STOCK_THRESHOLD": "1",
})

from datetime import datetime
from unittest.mock import MagicMock, patch

import requests

import notifications
from app import create_app
from extensions import db
from models import Locker, LockerBox, Order, Product, User
from payments import CulqiProvider, PaymentError

app = create_app()
client = app.test_client()
SENT = []
notifications._deliver = lambda cfg, to, subject, text, html=None, qr=None: SENT.append((to, subject, text, bool(qr)))


def check(name, cond):
    print(("OK   " if cond else "FALLA"), name)
    if not cond:
        raise SystemExit(1)


def subjects():
    return [s for _, s, _, _ in SENT]


def culqi_response(status=201, **overrides):
    """Respuesta falsa de POST /v2/charges."""
    data = {
        "object": "charge",
        "id": "chr_test_ABC123",
        "amount": 2000,
        "currency_code": "PEN",
        "outcome": {"type": "venta_exitosa", "code": "AUT0000"},
        "source": {"object": "token", "id": "tkn_test_1", "type": "card"},
    }
    data.update(overrides)
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = data
    return resp


with app.app_context():
    admin = User(name="Admin", email="admin@malhu.com", role="admin")
    admin.set_password("admin123")
    product = Product(name="Jugo de naranja", price=10, stock=6, category="Bebidas")
    locker = Locker(name="Locker A", device_id="LOCKER-001", last_seen=datetime.utcnow())
    db.session.add_all([admin, product, locker])
    db.session.flush()
    for n in (1, 2, 3):
        db.session.add(LockerBox(locker_id=locker.id, box_number=n))
    db.session.commit()
    product_id, locker_id = product.id, locker.id

ana = client.post("/api/auth/register", json={"name": "Ana Pérez", "email": "ana@mail.com", "password": "123456"}).get_json()["token"]
bob = client.post("/api/auth/register", json={"name": "Bob", "email": "bob@mail.com", "password": "123456"}).get_json()["token"]
H = lambda t: {"Authorization": f"Bearer {t}"}


def new_order(token, qty=2):
    r = client.post("/api/orders", json={"items": [{"product_id": product_id, "quantity": qty}], "locker_id": locker_id}, headers=H(token))
    return r.get_json()["id"]


def pay(oid, token, body):
    return client.post(f"/api/orders/{oid}/pay", json=body, headers=H(token))


def stock():
    with app.app_context():
        return Product.query.get(product_id).stock


# ---------- configuración pública ----------
cfg = client.get("/api/config").get_json()
check("/api/config expone la pasarela y SOLO la llave pública", cfg["payment_provider"] == "culqi" and cfg["culqi_public_key"] == "pk_test_abc123")
check("La llave secreta nunca sale en /api/config", "sk_test" not in client.get("/api/config").get_data(as_text=True))

# ---------- validaciones antes de cobrar ----------
oid = new_order(ana)
with patch("payments.requests.post") as post:
    check("Sin token de Culqi -> 400 y no llama a Culqi", pay(oid, ana, {}).status_code == 400 and not post.called)
    check("Token con formato raro -> 400", pay(oid, ana, {"token_id": "hola"}).status_code == 400 and not post.called)
    check("Otro cliente no puede pagar mi pedido", pay(oid, bob, {"token_id": "tkn_test_1"}).status_code == 403 and not post.called)

# ---------- pago con tarjeta aprobado ----------
with patch("payments.requests.post", return_value=culqi_response()) as post:
    r = pay(oid, ana, {"token_id": "tkn_test_1"})
    kwargs = post.call_args.kwargs
    url = post.call_args.args[0]
data = r.get_json()
check("Pago aprobado -> pedido pagado con código de retiro", r.status_code == 200 and data["status"] == "pagado" and data["pickup_code"])
check("Llama a /v2/charges de Culqi", url == "https://api.culqi.com/v2/charges")
check("Autentica con la llave secreta (Bearer sk_)", kwargs["headers"]["Authorization"] == "Bearer sk_test_xyz789")
body = kwargs["json"]
check("Cobra S/. 20.00 = 2000 céntimos en PEN", body["amount"] == 2000 and body["currency_code"] == "PEN")
check("Envía el token, el correo del cliente y captura inmediata", body["source_id"] == "tkn_test_1" and body["email"] == "ana@mail.com" and body["capture"] is True)
check("Deja el id del pedido en metadata", body["metadata"]["order_id"] == oid)
with app.app_context():
    o = Order.query.get(oid)
    check("Guarda el id del cargo de Culqi como referencia", o.payment_ref == "chr_test_ABC123")
    check("Guarda el método 'tarjeta'", o.payment_method == "tarjeta")
check("Descuenta el stock (6 -> 4)", stock() == 4)
cliente = [m for m in SENT if m[0] == ["ana@mail.com"]]
check("Correo al cliente con su QR", len(cliente) == 1 and cliente[0][3] and data["pickup_code"] in cliente[0][2])
check("Aviso de pedido nuevo al admin", any("Pedido nuevo" in s for s in subjects()))

# ---------- no se cobra dos veces ----------
with patch("payments.requests.post") as post:
    check("Pagar otra vez un pedido ya pagado -> 400 sin llamar a Culqi", pay(oid, ana, {"token_id": "tkn_test_2"}).status_code == 400 and not post.called)

# ---------- Yape ----------
oid_yape = new_order(ana, qty=1)
yape = culqi_response(id="chr_test_YAPE", amount=1000, source={"object": "token", "id": "tkn_test_y", "type": "yape"})
with patch("payments.requests.post", return_value=yape):
    r = pay(oid_yape, ana, {"token_id": "tkn_test_y"})
check("Pago con Yape aprobado", r.status_code == 200 and r.get_json()["status"] == "pagado")
with app.app_context():
    check("Guarda el método 'yape'", Order.query.get(oid_yape).payment_method == "yape")
check("Stock 4 -> 3", stock() == 3)

# ---------- tarjeta rechazada ----------
SENT.clear()
oid_bad = new_order(ana, qty=1)
declined = culqi_response(status=400, object="error", type="card_error", user_message="La tarjeta fue denegada.")
with patch("payments.requests.post", return_value=declined):
    r = pay(oid_bad, ana, {"token_id": "tkn_test_3"})
check("Tarjeta rechazada -> 400 con el mensaje de Culqi", r.status_code == 400 and "denegada" in r.get_json()["error"])
with app.app_context():
    check("El pedido sigue pendiente y sin referencia", Order.query.get(oid_bad).status == "pendiente_pago" and Order.query.get(oid_bad).payment_ref is None)
check("No toca el stock", stock() == 3)
check("No manda correos por un rechazo", not SENT)

# ---------- 3D Secure (Culqi responde 200) ----------
with patch("payments.requests.post", return_value=culqi_response(status=200, action_code="REVIEW")):
    r = pay(oid_bad, ana, {"token_id": "tkn_test_4"})
check("3D Secure no soportado -> 400 con mensaje claro y sin cobrar", r.status_code == 400 and "3D Secure" in r.get_json()["error"])
with app.app_context():
    check("El pedido sigue pendiente tras el 3DS", Order.query.get(oid_bad).status == "pendiente_pago")

# ---------- Culqi no responde: no sabemos si cobró -> avisa al admin ----------
SENT.clear()
with patch("payments.requests.post", side_effect=requests.Timeout("lento")):
    r = pay(oid_bad, ana, {"token_id": "tkn_test_5"})
check("Timeout -> 502 y no marca el pedido como pagado", r.status_code == 502)
check("Avisa al admin para revisar el cargo en Culqi", any("Cobro sin confirmar" in s for s in subjects()))
with app.app_context():
    check("El pedido sigue pendiente tras el timeout", Order.query.get(oid_bad).status == "pendiente_pago")

SENT.clear()
with patch("payments.requests.post", return_value=culqi_response(status=502, object="error")):
    r = pay(oid_bad, ana, {"token_id": "tkn_test_6"})
check("Error 5xx de Culqi -> 502 y aviso al admin", r.status_code == 502 and any("Cobro sin confirmar" in s for s in subjects()))

with patch("payments.requests.post", return_value=culqi_response(outcome={"type": "otra_cosa"})):
    r = pay(oid_bad, ana, {"token_id": "tkn_test_7"})
check("201 sin 'venta_exitosa' no se da por pagado", r.status_code == 502)
with app.app_context():
    check("Sigue pendiente (nunca se confirma sin venta_exitosa)", Order.query.get(oid_bad).status == "pendiente_pago")

# ---------- se cobró pero ya no hay stock -> cancelar y avisar para reembolsar ----------
SENT.clear()
oid_race = new_order(ana, qty=1)
real_charge = CulqiProvider.charge


def charge_and_sell_out(self, order, method, payload=None):
    result = real_charge(self, order, method, payload)
    # Simula que el stock se agotó justo después de cobrar
    Product.query.get(product_id).stock = 0
    return result


with patch.object(CulqiProvider, "charge", charge_and_sell_out), \
        patch("payments.requests.post", return_value=culqi_response(id="chr_test_RACE", amount=1000)):
    r = pay(oid_race, ana, {"token_id": "tkn_test_8"})
check("Cobro hecho pero sin stock -> 409 avisando que se devolverá", r.status_code == 409 and "devolveremos" in r.get_json()["error"])
with app.app_context():
    o = Order.query.get(oid_race)
    check("El pedido queda cancelado con la referencia del cargo", o.status == "cancelado" and o.payment_ref == "chr_test_RACE")
check("Avisa al admin que hay que reembolsar en el CulqiPanel", any("reembolsar" in s for s in subjects()) and any("CulqiPanel" in m[2] for m in SENT))

# ---------- llaves mal configuradas ----------
for bad in (
    {"CULQI_PUBLIC_KEY": "", "CULQI_SECRET_KEY": "sk_test_x"},
    {"CULQI_PUBLIC_KEY": "xxx", "CULQI_SECRET_KEY": "sk_test_x"},
    {"CULQI_PUBLIC_KEY": "pk_test_x", "CULQI_SECRET_KEY": "sk_live_x"},
):
    try:
        CulqiProvider(bad)
        check(f"Llaves inválidas rechazadas {bad}", False)
    except PaymentError:
        pass
check("Llaves vacías, con formato raro o test+live mezclados se rechazan", True)
check("Llaves correctas (live + live) se aceptan", CulqiProvider({"CULQI_PUBLIC_KEY": "pk_live_x", "CULQI_SECRET_KEY": "sk_live_x"}).api_url == "https://api.culqi.com")

print("\nTodo bien.")
