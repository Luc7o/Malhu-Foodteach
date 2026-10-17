"""
Agrega a una base de datos EXISTENTE las columnas nuevas de esta versión y pasa las
categorías de texto de tus productos a la tabla de categorías.
db.create_all() solo crea tablas que no existen; no modifica las que ya están.

Uso (una sola vez, ANTES de desplegar el backend nuevo, con DATABASE_URL apuntando a
la base de producción):
    python migrate.py

Es seguro ejecutarlo varias veces: solo agrega lo que falta.
Si prefieres empezar de cero: DROP DATABASE malhu_foodtech; y vuelve a correr create_database.sql.
"""
from sqlalchemy import inspect, text

from app import create_app
from extensions import db
from models import Category, Product

NEW_COLUMNS = [
    ("products", "category", "VARCHAR(60) NULL"),
    ("lockers", "device_key", "VARCHAR(64) NULL"),
    ("lockers", "last_seen", "DATETIME NULL"),
    ("orders", "paid_at", "DATETIME NULL"),
    ("orders", "payment_method", "VARCHAR(30) NULL"),
    ("orders", "payment_ref", "VARCHAR(100) NULL"),
    # --- categorías y estados de producto
    ("products", "category_id", "VARCHAR(36) NULL"),
    ("products", "status", "VARCHAR(12) NOT NULL DEFAULT 'publicado'"),
    ("products", "featured", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("products", "sold_out", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("products", "sort_order", "INTEGER NOT NULL DEFAULT 0"),
    # --- clientes y seguridad
    ("users", "active", "BOOLEAN NOT NULL DEFAULT TRUE"),
    ("users", "last_login_at", "DATETIME NULL"),
    ("users", "totp_secret", "VARCHAR(64) NULL"),
    ("users", "totp_enabled", "BOOLEAN NOT NULL DEFAULT FALSE"),
    # --- información nutricional y platos personalizables
    ("products", "calories", "INTEGER NULL"),
    ("products", "protein_g", "NUMERIC(6,1) NULL"),
    ("products", "carbs_g", "NUMERIC(6,1) NULL"),
    ("products", "fat_g", "NUMERIC(6,1) NULL"),
    ("products", "serving", "VARCHAR(60) NULL"),
    ("products", "ingredient_only", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("order_items", "selections", "TEXT NULL"),
    ("order_items", "calories", "INTEGER NULL"),
]

app = create_app()

with app.app_context():
    inspector = inspect(db.engine)
    added = 0
    new_status_column = False
    for table, column, ddl in NEW_COLUMNS:
        existing = {c["name"] for c in inspector.get_columns(table)}
        if column in existing:
            continue
        if db.engine.dialect.name == "postgresql":
            ddl = ddl.replace("DATETIME", "TIMESTAMP")  # en Postgres se llama TIMESTAMP
        db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
        print(f"+ {table}.{column}")
        added += 1
        if (table, column) == ("products", "status"):
            new_status_column = True
    db.session.commit()

    # Los productos que estaban ocultos pasan a "archivado"; los visibles ya quedaron "publicado"
    if new_status_column:
        Product.query.filter(Product.active.is_(False)).update({"status": "archivado"})
        db.session.commit()
        print("+ estados de producto: los ocultos quedaron como 'archivado'")

    # Categorías de texto -> tabla de categorías (en orden alfabético, como las mostraba el menú)
    pending = Product.query.filter(Product.category_id.is_(None)).all()
    names = sorted({(p.category or "").strip() for p in pending if (p.category or "").strip()}, key=str.lower)
    if names:
        by_name = {c.name.lower(): c for c in Category.query.all()}
        for name in names:
            if name.lower() not in by_name:
                cat = Category(name=name, sort_order=len(by_name))
                db.session.add(cat)
                by_name[name.lower()] = cat
                print(f"+ categoría: {name}")
        db.session.flush()
        for p in pending:
            name = (p.category or "").strip()
            if name:
                cat = by_name[name.lower()]
                p.category_id = cat.id
                p.category = cat.name
        db.session.commit()
        added += 1

    # Las tablas nuevas (categories, health_tags, option_groups, option_group_items...) las crea solo create_app()
    print("Listo." if added else "Nada que migrar en las tablas existentes (las tablas nuevas se crean solas al arrancar).")
