"""
Agrega a una base de datos EXISTENTE las columnas nuevas de esta versión.
db.create_all() solo crea tablas que no existen; no modifica las que ya están.

Uso (una sola vez, con el backend detenido):
    python migrate.py

Es seguro ejecutarlo varias veces: solo agrega lo que falta.
Si prefieres empezar de cero: DROP DATABASE malhu_foodtech; y vuelve a correr create_database.sql.
"""
from sqlalchemy import inspect, text

from app import create_app
from extensions import db

NEW_COLUMNS = [
    ("products", "category", "VARCHAR(60) NULL"),
    ("lockers", "device_key", "VARCHAR(64) NULL"),
    ("lockers", "last_seen", "DATETIME NULL"),
    ("orders", "paid_at", "DATETIME NULL"),
    ("orders", "payment_method", "VARCHAR(30) NULL"),
    ("orders", "payment_ref", "VARCHAR(100) NULL"),
]

app = create_app()

with app.app_context():
    inspector = inspect(db.engine)
    added = 0
    for table, column, ddl in NEW_COLUMNS:
        existing = {c["name"] for c in inspector.get_columns(table)}
        if column in existing:
            continue
        db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
        print(f"+ {table}.{column}")
        added += 1
    db.session.commit()
    print("Listo." if added else "Nada que migrar: la base ya está al día.")
