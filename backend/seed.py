"""
Script de datos de prueba. Ejecutar una sola vez después de crear las tablas:
    python seed.py
"""
from app import create_app
from extensions import db
from models import User, Product, Locker, LockerBox

app = create_app()

with app.app_context():
    # Usuario admin
    if not User.query.filter_by(email="admin@malhu.com").first():
        admin = User(name="Admin Malhu", email="admin@malhu.com", role="admin")
        admin.set_password("admin123")
        db.session.add(admin)

    # Locker de prueba (usa el mismo device_id que vas a poner en el firmware del ESP32)
    if not Locker.query.filter_by(device_id="LOCKER-001").first():
        locker = Locker(
            name="Locker Prototipo",
            address="Huancayo, Junín",
            device_id="LOCKER-001",
        )
        db.session.add(locker)
        db.session.flush()
        db.session.add(LockerBox(locker_id=locker.id, box_number=1, status="libre"))

    # Un par de productos de prueba
    if Product.query.count() == 0:
        db.session.add(Product(name="Sandwich de pollo", description="Con papas", price=12.50, stock=20))
        db.session.add(Product(name="Ensalada César", description="Porción individual", price=10.00, stock=15))
        db.session.add(Product(name="Jugo de naranja", description="500ml", price=5.00, stock=30))

    db.session.commit()
    print("Datos de prueba creados. Login admin: admin@malhu.com / admin123")
