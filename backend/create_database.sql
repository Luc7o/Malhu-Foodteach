-- Ejecuta esto una sola vez en MySQL antes de correr el backend.
-- Las tablas las crea Flask-SQLAlchemy automáticamente (db.create_all()) al iniciar app.py.

CREATE DATABASE IF NOT EXISTS malhu_foodtech
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
