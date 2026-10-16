"""Bloqueo temporal tras varios intentos fallidos (inicio de sesión, contraseña, 2FA)."""
from datetime import datetime, timedelta

from flask import current_app

from extensions import db
from models import LoginAttempt


def minutes_locked(key):
    """Minutos que faltan para poder reintentar (0 si no está bloqueado)."""
    row = db.session.get(LoginAttempt, key)
    now = datetime.utcnow()
    if row and row.locked_until and row.locked_until > now:
        return max(1, int((row.locked_until - now).total_seconds() // 60) + 1)
    return 0


def register_failure(key):
    """Suma un fallo. Devuelve True si con este fallo la cuenta quedó bloqueada."""
    now = datetime.utcnow()
    row = db.session.get(LoginAttempt, key)
    if not row:
        row = LoginAttempt(key=key, count=0)
        db.session.add(row)
    if row.locked_until and row.locked_until <= now:
        row.count = 0
        row.locked_until = None
    row.count += 1
    row.updated_at = now
    locked = False
    if row.count >= current_app.config["LOGIN_MAX_ATTEMPTS"]:
        row.locked_until = now + timedelta(minutes=current_app.config["LOGIN_LOCK_MINUTES"])
        row.count = 0
        locked = True
    db.session.commit()
    return locked


def clear_attempts(key):
    row = db.session.get(LoginAttempt, key)
    if row:
        db.session.delete(row)
        db.session.commit()


def lock_message(minutes):
    return f"Demasiados intentos fallidos. Espera {minutes} min e inténtalo de nuevo."
