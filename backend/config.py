import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


def _database_uri():
    """
    Lee DATABASE_URL. Railway, Supabase y similares entregan "postgres://..." o
    "postgresql://..."; SQLAlchemy necesita indicar el driver (psycopg2).
    MySQL (mysql+pymysql://...) y SQLite siguen funcionando igual en tu equipo.
    """
    url = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:password@localhost/malhu_foodtech",
    ).strip()
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


def _origins():
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if raw == "*":
        return "*"
    return [o.strip() for o in raw.split(",") if o.strip()]


class Config:
    # Ejemplos de DATABASE_URL:
    #   Postgres (Railway/Supabase): postgresql://usuario:password@host:5432/railway
    #   MySQL local:                 mysql+pymysql://usuario:password@localhost/malhu_foodtech
    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Evita errores por conexiones que el servidor de base de datos ya cerró
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "cambia-esto-en-produccion")
    # Por defecto flask-jwt-extended expira el token en 15 minutos, lo cual
    # cierra la sesión muy rápido durante desarrollo/pruebas. Lo extendemos
    # a un valor configurable (8 horas por defecto).
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        hours=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_HOURS", "8"))
    )

    # Cuánto tiempo dura un código QR antes de expirar (en horas)
    PICKUP_CODE_EXPIRATION_HOURS = int(os.getenv("PICKUP_CODE_EXPIRATION_HOURS", "24"))

    # Minutos que un pedido puede quedar sin pagar antes de cancelarse solo
    PENDING_ORDER_TTL_MINUTES = int(os.getenv("PENDING_ORDER_TTL_MINUTES", "30"))

    # Pasarela de pago: "simulated" (pago de prueba), "culqi" o "izipay".
    PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "simulated")

    # Orígenes permitidos por CORS. "*" en desarrollo; en producción, la URL del frontend.
    CORS_ORIGINS = _origins()

    # Seguridad del inicio de sesión: tras N fallos seguidos se bloquea ese correo un rato
    LOGIN_MAX_ATTEMPTS = int(os.getenv("LOGIN_MAX_ATTEMPTS", "5"))
    LOGIN_LOCK_MINUTES = int(os.getenv("LOGIN_LOCK_MINUTES", "15"))
    # Nombre que aparece en la app autenticadora (Google Authenticator, Authy...)
    TOTP_ISSUER = os.getenv("TOTP_ISSUER", "MALHÚ Admin")

    # Zona horaria para agrupar las ventas por día en el dashboard (Perú = UTC-5)
    TZ_OFFSET_HOURS = int(os.getenv("TZ_OFFSET_HOURS", "-5"))

    # Un ESP32 se considera "en línea" si envió señal en los últimos N segundos
    DEVICE_ONLINE_SECONDS = int(os.getenv("DEVICE_ONLINE_SECONDS", "90"))
    # Segundos que el firmware debe mantener abierta la cerradura
    DEVICE_OPEN_SECONDS = int(os.getenv("DEVICE_OPEN_SECONDS", "5"))

    # Imágenes de productos subidas por el admin (se guardan en disco, no en la base de datos)
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", os.path.join(BASE_DIR, "uploads"))
    MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "5"))
    MAX_CONTENT_LENGTH = MAX_UPLOAD_MB * 1024 * 1024

    # Llave digital del admin para abrir una caja y cargar productos
    ADMIN_KEY_DEFAULT_MINUTES = int(os.getenv("ADMIN_KEY_DEFAULT_MINUTES", "10"))
    ADMIN_KEY_MAX_MINUTES = int(os.getenv("ADMIN_KEY_MAX_MINUTES", "60"))

    # Apertura remota con botón: segundos que una orden espera al ESP32 antes de vencer
    OPEN_COMMAND_TTL_SECONDS = int(os.getenv("OPEN_COMMAND_TTL_SECONDS", "30"))

    # Si el ESP32 avisa que la puerta no se abrió, el código del cliente se restaura
    # solo si fue validado hace menos de estos segundos.
    RESTORE_WINDOW_SECONDS = int(os.getenv("RESTORE_WINDOW_SECONDS", "180"))

    # ---------- MQTT (órdenes en tiempo real al ESP32) ----------
    # Con MQTT_HOST vacío no se usa MQTT y el ESP32 sigue consultando por HTTP.
    MQTT_HOST = os.getenv("MQTT_HOST", "").strip()            # ej. abc123.s1.eu.hivemq.cloud
    MQTT_PORT = int(os.getenv("MQTT_PORT", "8883"))           # 8883 = TLS
    MQTT_USERNAME = os.getenv("MQTT_USERNAME", "")
    MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")
    MQTT_TLS = os.getenv("MQTT_TLS", "1") == "1"
    MQTT_TOPIC_PREFIX = os.getenv("MQTT_TOPIC_PREFIX", "malhu").strip("/")
    MQTT_CLIENT_ID = os.getenv("MQTT_CLIENT_ID", "malhu-backend")

    # ---------- Izipay (PAYMENT_PROVIDER=izipay) ----------
    # Credenciales API REST del Back Office Vendedor (modo TEST o PRODUCCIÓN).
    IZIPAY_USERNAME = os.getenv("IZIPAY_USERNAME", "")      # identificador de tienda
    IZIPAY_PASSWORD = os.getenv("IZIPAY_PASSWORD", "")      # clave de test/producción (también valida la IPN)
    IZIPAY_PUBLIC_KEY = os.getenv("IZIPAY_PUBLIC_KEY", "")  # clave pública
    IZIPAY_HMAC_KEY = os.getenv("IZIPAY_HMAC_KEY", "")      # clave HMAC-SHA-256 (valida el pago desde el navegador)
    IZIPAY_API_URL = os.getenv("IZIPAY_API_URL", "https://api.micuentaweb.pe")
    IZIPAY_STATIC_URL = os.getenv("IZIPAY_STATIC_URL", "https://static.micuentaweb.pe")
    # Opcional: URL pública de la IPN (https://tu-dominio/api/izipay/ipn). Si la dejas vacía,
    # configúrala en el Back Office: Configuración > Reglas de notificación.
    IZIPAY_IPN_URL = os.getenv("IZIPAY_IPN_URL", "")

    # ---------- Culqi (PAYMENT_PROVIDER=culqi) ----------
    # Llaves del CulqiPanel > Desarrollo > API Keys. Integración = pk_test_/sk_test_,
    # producción = pk_live_/sk_live_. La llave secreta NUNCA va en el frontend.
    CULQI_PUBLIC_KEY = os.getenv("CULQI_PUBLIC_KEY", "")
    CULQI_SECRET_KEY = os.getenv("CULQI_SECRET_KEY", "")
    CULQI_API_URL = os.getenv("CULQI_API_URL", "https://api.culqi.com")

    # ---------- Avisos por correo (SMTP) ----------
    MAIL_SERVER = os.getenv("MAIL_SERVER", "")              # vacío = no se envían correos
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "0") == "1"    # puerto 465
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_FROM = os.getenv("MAIL_FROM", "") or os.getenv("MAIL_USERNAME", "")
    # Correos que reciben las alertas del administrador (separados por coma).
    # Si está vacío se usa el correo de los usuarios con rol admin.
    ADMIN_ALERT_EMAILS = [e.strip() for e in os.getenv("ADMIN_ALERT_EMAILS", "").split(",") if e.strip()]
    LOW_STOCK_THRESHOLD = int(os.getenv("LOW_STOCK_THRESHOLD", "3"))
    ALERT_CHECK_SECONDS = int(os.getenv("ALERT_CHECK_SECONDS", "60"))
    ALERT_THREAD = os.getenv("ALERT_THREAD", "1") == "1"
    NOTIFICATIONS_SYNC = os.getenv("NOTIFICATIONS_SYNC", "0") == "1"  # solo para pruebas
    STORE_NAME = os.getenv("STORE_NAME", "MALHÚ")


# En producción no se permite arrancar con la clave JWT de ejemplo.
if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PRODUCTION") == "1":
    if Config.JWT_SECRET_KEY in ("", "cambia-esto-en-produccion"):
        raise RuntimeError(
            "Define JWT_SECRET_KEY en las variables de entorno antes de desplegar "
            "(por ejemplo: python -c \"import secrets; print(secrets.token_hex(32))\")."
        )
