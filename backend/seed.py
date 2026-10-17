"""
Script de datos de prueba. Ejecutar una sola vez después de crear las tablas:
    python seed.py
"""
import os

from app import create_app
from extensions import db
from models import Category, User, Product, Locker, LockerBox

app = create_app()

# En producción define ADMIN_EMAIL y ADMIN_PASSWORD al correr el seed
# (si no, se usan los datos de prueba de desarrollo).
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@malhu.com").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

PRODUCTS = [
    ("Sándwich de pollo", "Con papas al hilo", "Sándwiches", 12.50, 20),
    ("Sándwich mixto", "Jamón, queso y palta", "Sándwiches", 9.00, 18),
    ("Ensalada César", "Porción individual", "Ensaladas", 10.00, 15),
    ("Ensalada de quinua", "Quinua, palta y tomate", "Ensaladas", 11.00, 12),
    ("Jugo de naranja", "500 ml", "Bebidas", 5.00, 30),
    ("Limonada frozen", "500 ml", "Bebidas", 6.00, 25),
    ("Brownie de chocolate", "Con nueces", "Postres", 7.00, 10),
]

with app.app_context():
    # Usuario admin
    if not User.query.filter_by(email=ADMIN_EMAIL).first():
        admin = User(name="Admin Malhu", email=ADMIN_EMAIL, role="admin")
        admin.set_password(ADMIN_PASSWORD)
        db.session.add(admin)

    # Locker de prueba (usa el mismo device_id que vas a poner en el firmware del ESP32)
    # 6 cajas = 2 filas x 3 columnas del prototipo.
    if not Locker.query.filter_by(device_id="LOCKER-001").first():
        locker = Locker(
            name="Locker Prototipo",
            address="Huancayo, Junín",
            device_id="LOCKER-001",
        )
        db.session.add(locker)
        db.session.flush()
        for n in range(1, 7):
            db.session.add(LockerBox(locker_id=locker.id, box_number=n, status="libre"))

    # Categorías y productos de prueba
    if Product.query.count() == 0:
        categories = {}
        for position, (_, _, category, _, _) in enumerate(PRODUCTS):
            if category not in categories:
                categories[category] = Category(name=category, sort_order=len(categories))
                db.session.add(categories[category])
        db.session.flush()
        for position, (name, description, category, price, stock) in enumerate(PRODUCTS):
            db.session.add(Product(
                name=name, description=description, category=category,
                category_id=categories[category].id,
                price=price, stock=stock, sort_order=position,
            ))

    db.session.commit()
    print(f"Datos creados. Login admin: {ADMIN_EMAIL}")
    if ADMIN_PASSWORD == "admin123":
        print("AVISO: estás usando la clave de prueba 'admin123'. Cámbiala antes de salir a producción.")
