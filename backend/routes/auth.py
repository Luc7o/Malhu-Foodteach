from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import func

from extensions import db
from models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _token_for(user):
    return create_access_token(identity=user.id, additional_claims={"role": user.role})


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
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter(func.lower(User.email) == email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Credenciales inválidas"}), 401

    return jsonify({"token": _token_for(user), "user": user.to_dict()})


@auth_bp.get("/me")
@jwt_required()
def me():
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify({"user": user.to_dict()})
