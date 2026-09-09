import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


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
