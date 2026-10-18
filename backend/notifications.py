"""
Avisos por correo.

Cliente : cuando su pedido ya está en la caja (con el código QR de retiro).
Admin   : pedido nuevo, locker sin señal, producto por agotarse o agotado, y pagos que
          hay que reembolsar.

Si MAIL_SERVER está vacío no se envía nada (el sistema sigue funcionando y deja el aviso
en la consola). Los correos se envían en segundo plano para no hacer lenta la web.
"""
import smtplib
import threading
import time
from base64 import b64decode
from datetime import datetime
from email.message import EmailMessage
from html import escape
from io import BytesIO

import qrcode
from flask import current_app

from extensions import db
from models import AlertState, Locker, LockerEvent, Product, User

_MAIL_KEYS = ("MAIL_SERVER", "MAIL_PORT", "MAIL_USE_SSL", "MAIL_USERNAME", "MAIL_PASSWORD", "MAIL_FROM")


def _deliver(cfg, recipients, subject, text, html=None, qr_png=None):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = cfg["MAIL_FROM"]
    msg["To"] = ", ".join(recipients)
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")
        if qr_png:
            msg.get_payload()[1].add_related(qr_png, "image", "png", cid="<qr>")
    if cfg["MAIL_USE_SSL"]:
        server = smtplib.SMTP_SSL(cfg["MAIL_SERVER"], cfg["MAIL_PORT"], timeout=15)
    else:
        server = smtplib.SMTP(cfg["MAIL_SERVER"], cfg["MAIL_PORT"], timeout=15)
    try:
        if not cfg["MAIL_USE_SSL"]:
            server.starttls()
        if cfg["MAIL_USERNAME"]:
            server.login(cfg["MAIL_USERNAME"], cfg["MAIL_PASSWORD"])
        server.send_message(msg)
    finally:
        server.quit()


def _safe_deliver(*args):
    try:
        _deliver(*args)
    except Exception as e:  # un correo que falla nunca debe romper un pedido
        print(f"[avisos] No se pudo enviar el correo: {e}")


def send_email(recipients, subject, text, html=None, qr_png=None):
    """Envía un correo en segundo plano. Devuelve False si no hay SMTP configurado."""
    recipients = [r for r in recipients if r]
    cfg = {k: current_app.config[k] for k in _MAIL_KEYS}
    if not recipients or not cfg["MAIL_SERVER"] or not cfg["MAIL_FROM"]:
        print(f"[avisos] (sin SMTP) {subject}: {text.splitlines()[0] if text else ''}")
        return False
    args = (cfg, recipients, subject, text, html, qr_png)
    if current_app.config["NOTIFICATIONS_SYNC"]:
        _safe_deliver(*args)
    else:
        threading.Thread(target=_safe_deliver, args=args, daemon=True).start()
    return True


def admin_emails():
    configured = current_app.config["ADMIN_ALERT_EMAILS"]
    if configured:
        return configured
    return [u.email for u in User.query.filter_by(role="admin").all()]


def alert_admin(subject, body):
    store = current_app.config["STORE_NAME"]
    return send_email(admin_emails(), f"[{store}] {subject}", body)


# ---------------------------------------------------------------- cliente
def _qr_png(code):
    buffer = BytesIO()
    qrcode.make(code).save(buffer, format="PNG")
    return buffer.getvalue()


def notify_order_paid(order):
    """Correo al cliente con su QR + aviso de pedido nuevo al administrador."""
    store = current_app.config["STORE_NAME"]
    pickup = order.pickup_code
    if not pickup:
        return
    box_number = pickup.box.box_number if pickup.box else "?"
    locker = order.locker.name if order.locker else "el locker"
    address = f" ({order.locker.address})" if order.locker and order.locker.address else ""
    expires = pickup.expires_at.strftime("%d/%m/%Y %H:%M") + " (hora UTC)"
    first_name = (order.user.name or "").split(" ")[0] or "hola"
    items = "\n".join(f"- {i.describe()}" for i in order.items if i.product)

    text = (
        f"Hola {first_name}, tu pedido ya está en la caja {box_number} de {locker}{address}.\n\n"
        f"Código de retiro: {pickup.code}\n"
        f"Acerca el código QR al lector del locker para abrir tu caja.\n"
        f"Vence: {expires}\n\n"
        f"Tu pedido:\n{items}\n\n"
        f"Total pagado: S/. {float(order.total):.2f}\n\n"
        f"También puedes ver tu QR en 'Mis pedidos'. — {store}"
    )
    items_html = "".join(f"<li>{escape(i.describe())}</li>" for i in order.items if i.product)
    html = f"""
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0F2A1D">
  <h2 style="color:#375534">Tu pedido está listo para retirar</h2>
  <p>Hola {escape(first_name)}, tu pedido ya está en la <b>caja {box_number}</b> de {escape(locker)}{escape(address)}.</p>
  <p style="text-align:center"><img src="cid:qr" alt="Código QR" width="220" height="220"></p>
  <p style="text-align:center;font-size:18px"><b>{escape(pickup.code)}</b></p>
  <p>Acerca el QR al lector del locker para abrir tu caja.<br>Vence: {expires}</p>
  <ul>{items_html}</ul>
  <p><b>Total pagado:</b> S/. {float(order.total):.2f}</p>
  <p style="color:#566E5A;font-size:13px">También puedes ver tu QR en «Mis pedidos». — {escape(store)}</p>
</div>"""
    send_email([order.user.contact_email], f"Tu pedido está listo en la caja {box_number}", text, html, _qr_png(pickup.code))

    alert_admin(
        f"Pedido nuevo de {order.user.name}",
        f"Pedido nuevo pagado: S/. {float(order.total):.2f}\n"
        f"Cliente: {order.user.name} ({order.user.contact_email})\n"
        f"Caja {box_number} de {locker}\n{items}",
    )


_GATEWAY_LABELS = {
    "izipay": ("Izipay", "el Back Office de Izipay"),
    "culqi": ("Culqi", "el CulqiPanel"),
}


def notify_refund_needed(order, reason):
    gateway, panel = _GATEWAY_LABELS.get(
        current_app.config.get("PAYMENT_PROVIDER"), ("La pasarela", "el panel de la pasarela")
    )
    alert_admin(
        "Pago recibido que hay que reembolsar",
        f"{gateway} confirmó un pago, pero no se pudo preparar el pedido: {reason}\n\n"
        f"Pedido: {order.id}\nCliente: {order.user.name} ({order.user.contact_email})\n"
        f"Monto: S/. {float(order.total):.2f}\nTransacción {gateway}: {order.payment_ref}\n\n"
        f"Reembolsa el monto desde {panel}.",
    )


# ---------------------------------------------------------------- alertas periódicas
def _arm(key):
    """True la primera vez que se dispara la alerta (y la deja registrada)."""
    if db.session.get(AlertState, key):
        return False
    db.session.add(AlertState(key=key, fired_at=datetime.utcnow()))
    db.session.commit()
    return True


def _disarm(key):
    """True si la alerta estaba activa y se acaba de resolver."""
    row = db.session.get(AlertState, key)
    if not row:
        return False
    db.session.delete(row)
    db.session.commit()
    return True


def check_alerts():
    """Locker sin señal y productos por agotarse. Cada alerta se envía una sola vez."""
    for locker in Locker.query.filter_by(active=True).all():
        if locker.last_seen is None:
            continue  # nunca se conectó: aún no está instalado
        key = f"locker_offline:{locker.id}"
        if not locker.is_online():
            if _arm(key):
                db.session.add(LockerEvent(locker_id=locker.id, kind="sin_senal", detail="El locker dejó de reportar"))
                db.session.commit()
                last = locker.last_seen.strftime("%d/%m/%Y %H:%M") + " (hora UTC)"
                alert_admin(
                    f"{locker.name} sin señal",
                    f"El locker {locker.name} no reporta desde {last}. Revisa la energía y el WiFi del ESP32.",
                )
        elif _disarm(key):
            db.session.add(LockerEvent(locker_id=locker.id, kind="en_linea", detail="El locker volvió a reportar"))
            db.session.commit()
            alert_admin(f"{locker.name} volvió a estar en línea", f"El locker {locker.name} ya está reportando.")

    threshold = current_app.config["LOW_STOCK_THRESHOLD"]
    for product in Product.query.filter_by(active=True).all():
        low_key, out_key = f"stock_low:{product.id}", f"stock_out:{product.id}"
        if product.stock <= 0:
            _arm(low_key)  # evita un segundo correo "por agotarse"
            if _arm(out_key):
                alert_admin(f"Producto agotado: {product.name}", f"{product.name} se quedó sin stock.")
        elif product.stock <= threshold:
            _disarm(out_key)
            if _arm(low_key):
                alert_admin(
                    f"Por agotarse: {product.name}",
                    f"Quedan {product.stock} unidades de {product.name} (aviso con {threshold} o menos).",
                )
        else:
            _disarm(low_key)
            _disarm(out_key)


def start_alert_thread(app):
    """Revisa las alertas cada ALERT_CHECK_SECONDS aunque nadie esté usando la web."""
    if not app.config["ALERT_THREAD"]:
        return

    def loop():
        time.sleep(app.config["ALERT_CHECK_SECONDS"])
        while True:
            try:
                with app.app_context():
                    check_alerts()
            except Exception as e:
                print(f"[avisos] Error revisando alertas: {e}")
            time.sleep(app.config["ALERT_CHECK_SECONDS"])

    threading.Thread(target=loop, daemon=True, name="alertas").start()
