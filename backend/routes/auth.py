from datetime import datetime

import pyotp
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import func

from extensions import db
from models import User
from security import clear_attempts, lock_message, minutes_locked, register_failure

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

MIN_NEW_PASSWORD = 8


def _token_for(user):
    return create_access_token(identity=user.id, additional_claims={"role": user.role})


def verify_totp(user, code):
    """True si el código de 6 dígitos de la app autenticadora es válido (tolera 30 s de desfase)."""
    if not user.totp_secret:
        return False
    code = "".join(ch for ch in str(code or "") if ch.isdigit())
    return len(code) == 6 and pyotp.TOTP(user.totp_secret).verify(code, valid_window=1)


@auth_bp.post("/register")
def register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "name, email y password son requeridos"}), 400
    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"error": "Ingresa un correo válido"}), 400
    if len(password) < 6:
        return jsonify({"error": "La contraseña debe tener al menos 6 caracteres"}), 400

    if User.query.filter(func.lower(User.email) == email).first():
        return jsonify({"error": "Ese correo ya está registrado"}), 409

    user = User(name=name, email=email, role="cliente")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"token": _token_for(user), "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    """
    Inicia sesión. Tras varios fallos seguidos el correo se bloquea unos minutos.

    "portal" indica desde dónde se entra: "admin" (el panel de administración) o "tienda"
    (valor por defecto). Las cuentas de administrador SOLO pueden entrar por el panel y las
    de clientes SOLO por la tienda, así que una cuenta admin nunca obtiene sesión en la tienda.

    Si la cuenta es de administrador y tiene verificación en dos pasos, la primera
    llamada (sin "otp") responde {"requires_otp": true} y la segunda lleva el código.
    """
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    portal = "admin" if data.get("portal") == "admin" else "tienda"
    key = f"login:{email}"

    wait = minutes_locked(key)
    if wait:
        return jsonify({"error": lock_message(wait)}), 429

    user = User.query.filter(func.lower(User.email) == email).first()
    if not user or not user.check_password(password):
        if register_failure(key):
            return jsonify({"error": lock_message(minutes_locked(key))}), 429
        return jsonify({"error": "Credenciales inválidas"}), 401

    if not user.active:
        return jsonify({"error": "Tu cuenta está desactivada. Contacta al administrador."}), 403

    # La contraseña es correcta, pero la cuenta no pertenece a este portal: no se da sesión
    if user.role == "admin" and portal != "admin":
        return jsonify({"error": "Las cuentas de administrador inician sesión en el panel de administración, no en la tienda."}), 403
    if user.role != "admin" and portal == "admin":
        return jsonify({"error": "Esta cuenta no tiene acceso al panel de administración."}), 403

    if user.role == "admin" and user.totp_enabled:
        otp = data.get("otp")
        if not otp:
            return jsonify({"requires_otp": True})
        if not verify_totp(user, otp):
            if register_failure(key):
                return jsonify({"error": lock_message(minutes_locked(key))}), 429
            return jsonify({"error": "Código de verificación incorrecto"}), 401

    clear_attempts(key)
    user.last_login_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"token": _token_for(user), "user": user.to_dict()})


@auth_bp.get("/me")
@jwt_required()
def me():
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify({"user": user.to_dict()})


@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    data = request.get_json() or {}
    current = data.get("current_password") or ""
    new = data.get("new_password") or ""
    key = f"pwchange:{user.id}"

    wait = minutes_locked(key)
    if wait:
        return jsonify({"error": lock_message(wait)}), 429
    if not user.check_password(current):
        if register_failure(key):
            return jsonify({"error": lock_message(minutes_locked(key))}), 429
        return jsonify({"error": "La contraseña actual no es correcta"}), 400
    if len(new) < MIN_NEW_PASSWORD:
        return jsonify({"error": f"La nueva contraseña debe tener al menos {MIN_NEW_PASSWORD} caracteres"}), 400
    if new == current:
        return jsonify({"error": "La nueva contraseña debe ser distinta a la actual"}), 400

    user.set_password(new)
    db.session.commit()
    clear_attempts(key)
    return jsonify({"ok": True})
