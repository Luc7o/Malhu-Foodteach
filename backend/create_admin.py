"""
Crea SOLO el usuario administrador (sin productos ni lockers de prueba).
Uso:
    ADMIN_NAME="Tu nombre" ADMIN_EMAIL="tu@correo.com" ADMIN_PASSWORD="clave-fuerte" python create_admin.py
"""
import os
import sys

from app import create_app
from extensions import db
from models import User

EMAIL = os.getenv("ADMIN_EMAIL", "").strip().lower()
PASSWORD = os.getenv("ADMIN_PASSWORD", "")
NAME = os.getenv("ADMIN_NAME", "Administrador").strip()

if not EMAIL or not PASSWORD:
    sys.exit("Falta ADMIN_EMAIL o ADMIN_PASSWORD.")

app = create_app()

with app.app_context():
    user = User.query.filter_by(email=EMAIL).first()
    if user:
        # Si el correo ya existe, lo convierte en admin y actualiza la clave
        user.role = "admin"
        user.set_password(PASSWORD)
        print(f"El usuario {EMAIL} ya existía: ahora es admin y su clave se actualizó.")
    else:
        user = User(name=NAME, email=EMAIL, role="admin")
        user.set_password(PASSWORD)
        db.session.add(user)
        print(f"Admin creado: {EMAIL}")
    db.session.commit()
