import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def _origins():
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if raw == "*":
        return "*"
    return [o.strip() for o in raw.split(",") if o.strip()]


class Config:
    # Ejemplo de DATABASE_URL: mysql+pymysql://usuario:password@localhost/malhu_foodtech
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:password@localhost/malhu_foodtech"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

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

    # Pasarela de pago: "simulated" (pago de prueba) hasta conectar una real.
    PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "simulated")

    # Orígenes permitidos por CORS. "*" en desarrollo; en producción, la URL del frontend.
    CORS_ORIGINS = _origins()

    # Zona horaria para agrupar las ventas por día en el dashboard (Perú = UTC-5)
    TZ_OFFSET_HOURS = int(os.getenv("TZ_OFFSET_HOURS", "-5"))

    # Un ESP32 se considera "en línea" si envió señal en los últimos N segundos
    DEVICE_ONLINE_SECONDS = int(os.getenv("DEVICE_ONLINE_SECONDS", "90"))
    # Segundos que el firmware debe mantener abierta la cerradura
    DEVICE_OPEN_SECONDS = int(os.getenv("DEVICE_OPEN_SECONDS", "5"))
