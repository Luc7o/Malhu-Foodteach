"""
Puente MQTT entre el backend y los lockers (ESP32).

Qué hace
--------
* Backend -> ESP32 : publica la orden "Abrir" (botón del panel) en tiempo real.
* ESP32 -> Backend : avisa que está en línea (y cuando se desconecta) y confirma
                     que recibió la orden (ack).

Temas (topics), con PREFIX = "malhu" por defecto:
    PREFIX/locker/<device_id>/cmd     backend -> ESP32   {"id","action","box_number","mode","open_seconds"}
    PREFIX/locker/<device_id>/ack     ESP32 -> backend   {"id": "<id de la orden>", "ok": true}
    PREFIX/locker/<device_id>/status  ESP32 -> backend   "online" (cada ~30 s)  /  "offline" (último deseo, LWT)

Si MQTT_HOST está vacío este módulo no hace nada y el sistema sigue funcionando con
la consulta HTTP de siempre (POST /api/locker/commands). Así puedes desplegar el
backend antes de tener el broker.

Validar el QR y los eventos de la puerta siguen por HTTP (necesitan respuesta inmediata).
"""
import json
import threading
from datetime import datetime

from extensions import db
from models import Locker, LockerEvent, OpenCommand

_client = None
_connected = threading.Event()
_lock = threading.Lock()


def enabled():
    return _client is not None


def is_connected():
    return _client is not None and _connected.is_set()


def _topic(app, device_id, leaf):
    return f"{app.config['MQTT_TOPIC_PREFIX']}/locker/{device_id}/{leaf}"


# ---------------------------------------------------------------------------
# Mensajes que llegan desde los ESP32
# ---------------------------------------------------------------------------
def _handle_status(device_id, payload):
    locker = Locker.query.filter_by(device_id=device_id).first()
    if not locker:
        return
    if payload.strip().lower() == "online":
        locker.last_seen = datetime.utcnow()
    else:
        # "offline" (último deseo): el locker se cayó; el panel lo muestra sin señal
        locker.last_seen = None
    db.session.commit()


def _handle_ack(device_id, payload):
    try:
        data = json.loads(payload)
    except ValueError:
        return
    cmd_id = data.get("id")
    if not cmd_id:
        return
    locker = Locker.query.filter_by(device_id=device_id).first()
    cmd = OpenCommand.query.get(cmd_id)
    if not locker or not cmd or cmd.locker_id != locker.id:
        return
    if data.get("ok") is False:
        # El ESP32 rechazó la orden (está ocupado o esa caja no está cableada)
        if cmd.status in ("pendiente", "enviado"):
            cmd.status = "expirado"
            db.session.add(LockerEvent(
                locker_id=locker.id,
                kind="rechazado",
                box_number=cmd.box.box_number,
                detail=f"Botón Abrir no ejecutado: {str(data.get('reason') or 'ocupado')}"[:200],
            ))
        locker.last_seen = datetime.utcnow()
        db.session.commit()
        return
    if cmd.status in ("pendiente", "enviado"):
        cmd.status = "entregado"
        cmd.delivered_at = datetime.utcnow()
        who = cmd.creator.name if cmd.creator else "admin"
        db.session.add(LockerEvent(
            locker_id=locker.id,
            kind="carga",
            box_number=cmd.box.box_number,
            detail=f"Botón Abrir de {who} (MQTT)"[:200],
        ))
    locker.last_seen = datetime.utcnow()
    db.session.commit()


def _on_message(app):
    def callback(_client, _userdata, msg):
        parts = msg.topic.split("/")  # PREFIX / locker / <device_id> / <leaf>
        if len(parts) < 4:
            return
        device_id, leaf = parts[-2], parts[-1]
        try:
            payload = msg.payload.decode("utf-8", "replace")
            with app.app_context():
                if leaf == "status":
                    _handle_status(device_id, payload)
                elif leaf == "ack":
                    _handle_ack(device_id, payload)
        except Exception as e:  # un mensaje raro nunca debe tumbar el cliente MQTT
            print(f"[mqtt] Error procesando {msg.topic}: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass
    return callback


def _on_connect(app):
    prefix = app.config["MQTT_TOPIC_PREFIX"]

    def callback(client, _userdata, _flags, reason_code, _properties=None):
        if getattr(reason_code, "is_failure", False) or (
            isinstance(reason_code, int) and reason_code != 0
        ):
            print(f"[mqtt] No se pudo conectar: {reason_code}")
            return
        print("[mqtt] Conectado al broker")
        client.subscribe(f"{prefix}/locker/+/status", qos=1)
        client.subscribe(f"{prefix}/locker/+/ack", qos=1)
        _connected.set()
    return callback


def _on_disconnect(_client, _userdata, *_args, **_kwargs):
    _connected.clear()
    print("[mqtt] Desconectado del broker (se reintenta solo)")


# ---------------------------------------------------------------------------
# API pública del módulo
# ---------------------------------------------------------------------------
def init_mqtt(app):
    """Arranca el cliente MQTT en segundo plano. No hace nada si MQTT_HOST está vacío."""
    global _client
    cfg = app.config
    if not cfg.get("MQTT_HOST"):
        print("[mqtt] MQTT_HOST vacío: se usa la consulta HTTP de siempre.")
        return

    with _lock:
        if _client is not None:  # ya iniciado (por ejemplo, el recargador de Flask)
            return
        import paho.mqtt.client as mqtt

        client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id=cfg["MQTT_CLIENT_ID"],
            clean_session=True,
        )
        if cfg["MQTT_USERNAME"]:
            client.username_pw_set(cfg["MQTT_USERNAME"], cfg["MQTT_PASSWORD"])
        if cfg["MQTT_TLS"]:
            client.tls_set()  # valida el certificado del broker con las CA del sistema
        client.on_connect = _on_connect(app)
        client.on_message = _on_message(app)
        client.on_disconnect = _on_disconnect
        client.reconnect_delay_set(min_delay=1, max_delay=30)
        client.connect_async(cfg["MQTT_HOST"], cfg["MQTT_PORT"], keepalive=30)
        client.loop_start()
        _client = client


def publish_open(app, device_id, command):
    """
    Publica la orden de apertura. Devuelve True si el broker la aceptó.
    (No retenida: si el ESP32 está desconectado, la orden no llega después y no abre
    una caja por sorpresa.)
    """
    if not is_connected():
        return False
    try:
        info = _client.publish(
            _topic(app, device_id, "cmd"), json.dumps(command), qos=1, retain=False
        )
        info.wait_for_publish(timeout=3)
        return info.is_published()
    except Exception as e:
        print(f"[mqtt] No se pudo publicar la orden: {e}")
        return False
