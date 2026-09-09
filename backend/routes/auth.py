from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

from extensions import db
from models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({"error": "name, email y password son requeridos"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Ese correo ya está registrado"}), 409

    user = User(name=name, email=email, role="cliente")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(
        identity=user.id, additional_claims={"role": user.role}
    )
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Credenciales inválidas"}), 401

    token = create_access_token(
        identity=user.id, additional_claims={"role": user.role}
    )
    return jsonify({"token": token, "user": user.to_dict()})
