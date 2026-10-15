"""
Pruebas del pago con Izipay y de los avisos. No usa internet ni tu MySQL:
simula las respuestas de Izipay y captura los correos.
    python test_izipay.py
"""
import hashlib
import hmac
import json
import os
import tempfile

os.environ.update({
    "DATABASE_URL": "sqlite:///:memory:",
    "UPLOAD_FOLDER": tempfile.mkdtemp(prefix="malhu_uploads_"),
    "PAYMENT_PROVIDER": "izipay",
    "IZIPAY_USERNAME": "12345678",
    "IZIPAY_PASSWORD": "testpassword_X",
    "IZIPAY_PUBLIC_KEY": "12345678:testpublickey_X",
    "IZIPAY_HMAC_KEY": "test_hmac_X",
    "MAIL_SERVER": "smtp.prueba.local",
    "MAIL_FROM": "malhu@prueba.local",
    "ADMIN_ALERT_EMAILS": "dueno@malhu.test",
    "NOTIFICATIONS_SYNC": "1",
    "ALERT_THREAD": "0",
    "LOW_STOCK_THRESHOLD": "3",
})

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import notifications
from app import create_app
from extensions import db
from models import Locker, LockerBox, Order, Product, User

app = create_app()
client = app.test_client()
SENT = []
notifications._deliver = lambda cfg, to, subject, text, html=None, qr=None: SENT.append((to, subject, text, bool(qr)))


def check(name, cond):
    print(("OK   " if cond else "FALLA"), name)
    if not cond:
        raise SystemExit(1)


def sign(answer, key):
    raw = json.dumps(answer)
    return raw, hmac.new(key.encode(), raw.encode(), hashlib.sha256).hexdigest()


def answer_for(order_id, cents, status="PAID", currency="PEN"):
    return {
        "orderStatus": status,
        "orderDetails": {"orderId": order_id, "orderTotalAmount": cents, "orderCurrency": currency},
        "transactions": [{"uuid": "tx-" + order_id[:6], "paymentMethodType": "CARD"}],
    }


def subjects():
    return [s for _, s, _, _ in SENT]


with app.app_context():
    admin = User(name="Admin", email="admin@malhu.com", role="admin")
    admin.set_password("admin123")
    product = Product(name="Jugo de naranja", price=10, stock=5, category="Bebidas")
    locker = Locker(name="Locker A", device_id="LOCKER-001", last_seen=datetime.utcnow())
    db.session.add_all([admin, product, locker])
    db.session.flush()
    for n in (1, 2):
        db.session.add(LockerBox(locker_id=locker.id, box_number=n))
    db.session.commit()
    product_id, locker_id = product.id, locker.id

ana = client.post("/api/auth/register", json={"name": "Ana Pérez", "email": "ana@mail.com", "password": "123456"}).get_json()["token"]
bob = client.post("/api/auth/register", json={"name": "Bob", "email": "bob@mail.com", "password": "123456"}).get_json()["token"]
H = lambda t: {"Authorization": f"Bearer {t}"}


def new_order(token, qty=2):
    r = client.post("/api/orders", json={"items": [{"product_id": product_id, "quantity": qty}], "locker_id": locker_id}, headers=H(token))
    return r.get_json()["id"]


oid = new_order(ana)
fake = MagicMock()
fake.json.return_value = {"status": "SUCCESS", "answer": {"formToken": "TOKEN123"}}
with patch("payments.requests.post", return_value=fake) as post:
    r = client.post(f"/api/orders/{oid}/izipay/form-token", headers=H(ana))
    body = post.call_args.kwargs["json"]
check("Crea el formToken y devuelve la clave pública", r.status_code == 200 and r.get_json()["formToken"] == "TOKEN123" and "publicKey" in r.get_json())
check("Cobra S/. 20.00 = 2000 céntimos en PEN", body["amount"] == 2000 and body["currency"] == "PEN" and body["orderId"] == oid)
check("Otro cliente no puede pedir el token", client.post(f"/api/orders/{oid}/izipay/form-token", headers=H(bob)).status_code == 403)
check("El botón de pago simulado queda bloqueado", client.post(f"/api/orders/{oid}/pay", json={"method": "yape"}, headers=H(ana)).status_code == 400)

V = f"/api/orders/{oid}/izipay/validate"
raw, h = sign(answer_for(oid, 2000), "otra_clave")
check("Firma falsa -> rechazada", client.post(V, json={"kr_answer": raw, "kr_hash": h}, headers=H(ana)).status_code == 400)
raw, h = sign(answer_for("OTRO-PEDIDO", 2000), "test_hmac_X")
check("Pago de otro pedido -> rechazado", client.post(V, json={"kr_answer": raw, "kr_hash": h}, headers=H(ana)).status_code == 400)
raw, h = sign(answer_for(oid, 2000, status="UNPAID"), "test_hmac_X")
check("Pago no aprobado -> 402", client.post(V, json={"kr_answer": raw, "kr_hash": h}, headers=H(ana)).status_code == 402)
raw, h = sign(answer_for(oid, 500), "test_hmac_X")
check("Monto distinto -> no se confirma y avisa al admin",
      client.post(V, json={"kr_answer": raw, "kr_hash": h}, headers=H(ana)).status_code == 400
      and any("monto distinto" in s for s in subjects()))
with app.app_context():
    check("El pedido sigue pendiente", Order.query.get(oid).status == "pendiente_pago")

SENT.clear()
raw, h = sign(answer_for(oid, 2000), "test_hmac_X")
r = client.post(V, json={"kr_answer": raw, "kr_hash": h}, headers=H(ana))
data = r.get_json()
check("Pago válido -> pedido pagado con código de retiro", r.status_code == 200 and data["status"] == "pagado" and data["pickup_code"])
with app.app_context():
    check("Descuenta el stock (5 -> 3)", Product.query.get(product_id).stock == 3)
    check("Guarda la transacción de Izipay", Order.query.get(oid).payment_ref.startswith("tx-"))
cliente = [m for m in SENT if m[0] == ["ana@mail.com"]]
check("Correo al cliente con su QR y su código", len(cliente) == 1 and cliente[0][3] and data["pickup_code"] in cliente[0][2])
check("Aviso de pedido nuevo al admin", any("Pedido nuevo" in s for s in subjects()))
check("Aviso de producto por agotarse (quedan 3)", any("Por agotarse" in s for s in subjects()))

SENT.clear()
raw, h = sign(answer_for(oid, 2000), "testpassword_X")
r = client.post("/api/izipay/ipn", data={"kr-answer": raw, "kr-hash": h})
check("IPN repetida no cobra dos veces", r.status_code == 200 and "already_paid" in r.get_data(as_text=True) and not SENT)
with app.app_context():
    check("Stock intacto tras la IPN repetida", Product.query.get(product_id).stock == 3)
raw, h = sign(answer_for(oid, 2000), "otra_clave")
check("IPN con firma falsa -> 400", client.post("/api/izipay/ipn", data={"kr-answer": raw, "kr-hash": h}).status_code == 400)

# La IPN confirma un pedido aunque el cliente haya cerrado la ventana
oid2 = new_order(bob, qty=1)
raw, h = sign(answer_for(oid2, 1000), "testpassword_X")
r = client.post("/api/izipay/ipn", data={"kr-answer": raw, "kr-hash": h})
with app.app_context():
    check("IPN confirma el pedido sin el navegador", "OK paid" in r.get_data(as_text=True) and Order.query.get(oid2).status == "pagado")

# Pago confirmado pero sin cajas libres -> reembolso
with app.app_context():
    oid3_user = User.query.filter_by(email="ana@mail.com").first().id
    o3 = Order(user_id=oid3_user, locker_id=locker_id, total=10)
    db.session.add(o3)
    db.session.flush()
    from models import OrderItem
    db.session.add(OrderItem(order_id=o3.id, product_id=product_id, quantity=1, unit_price=10))
    for b in LockerBox.query.filter_by(locker_id=locker_id).all():
        b.status = "ocupado"
    db.session.commit()
    oid3 = o3.id
SENT.clear()
raw, h = sign(answer_for(oid3, 1000), "testpassword_X")
r = client.post("/api/izipay/ipn", data={"kr-answer": raw, "kr-hash": h})
with app.app_context():
    o3 = Order.query.get(oid3)
    check("Sin cajas: queda cancelado con la transacción guardada", "OK refund" in r.get_data(as_text=True) and o3.status == "cancelado" and o3.payment_ref)
check("Avisa al admin que hay que reembolsar", any("reembolsar" in s for s in subjects()))

# Alertas periódicas
SENT.clear()
with app.app_context():
    notifications.check_alerts()
    check("La alerta de stock no se repite", not any("Por agotarse" in s for s in subjects()))
    Product.query.get(product_id).stock = 20
    db.session.commit()
    notifications.check_alerts()
    Product.query.get(product_id).stock = 0
    db.session.commit()
    notifications.check_alerts()
    notifications.check_alerts()
check("Avisa una sola vez cuando se agota", subjects().count("[MALHÚ] Producto agotado: Jugo de naranja") == 1)

SENT.clear()
with app.app_context():
    Locker.query.get(locker_id).last_seen = datetime.utcnow() - timedelta(minutes=10)
    db.session.commit()
    notifications.check_alerts()
    notifications.check_alerts()
check("Avisa una sola vez cuando el locker pierde señal", sum("sin señal" in s for s in subjects()) == 1)
SENT.clear()
with app.app_context():
    Locker.query.get(locker_id).last_seen = datetime.utcnow()
    db.session.commit()
    notifications.check_alerts()
check("Avisa cuando el locker vuelve", any("volvió" in s for s in subjects()))
print("\nTodo bien.")
