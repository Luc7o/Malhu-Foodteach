import os
import time

from flask import Flask, jsonify, request, send_from_directory

from config import Config
from extensions import db, jwt, cors
from images import products_dir
from models import User
from services import expire_stale

from routes.auth import auth_bp
from routes.products import products_bp
from routes.lockers import lockers_bp
from routes.orders import orders_bp
from routes.locker_device import locker_device_bp
from routes.admin import admin_bp
from routes.categories import categories_bp
from routes.health_tags import health_tags_bp
from routes.izipay import izipay_bp
from notifications import start_alert_thread
from mqtt_bridge import init_mqtt

SWEEP_EVERY_SECONDS = 15


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(lockers_bp)
    app.register_blueprint(orders_bp)
    app.register_blueprint(locker_device_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(health_tags_bp)
    app.register_blueprint(izipay_bp)

    @jwt.token_in_blocklist_loader
    def account_disabled(_header, payload):
        # Un token deja de servir apenas el admin desactiva esa cuenta
        user = db.session.get(User, payload.get("sub"))
        return bool(user and not user.active)

    @jwt.revoked_token_loader
    def account_disabled_response(_header, _payload):
        return jsonify({"error": "Tu cuenta fue desactivada. Contacta al administrador."}), 401

    state = {"last_sweep": 0.0}

    @app.before_request
    def sweep_expired():
        # Expira códigos vencidos y pedidos sin pagar, como máximo cada 15 s.
        # (En producción con varios procesos conviene mover esto a una tarea programada.)
        if not request.path.startswith("/api") or request.method == "OPTIONS":
            return
        now = time.monotonic()
        if now - state["last_sweep"] >= SWEEP_EVERY_SECONDS:
            state["last_sweep"] = now
            expire_stale()

    @app.errorhandler(413)
    def too_large(_e):
        mb = app.config["MAX_UPLOAD_MB"]
        return jsonify({"error": f"El archivo es muy pesado (máximo {mb} MB)"}), 413

    @app.get("/uploads/<path:filename>")
    def serve_upload(filename):
        # Imágenes de productos subidas por el admin
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename, max_age=86400)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "app": "Malhu Foodtech"})

    @app.get("/api/config")
    def public_config():
        return jsonify({
            "payment_provider": app.config["PAYMENT_PROVIDER"],
            # La llave pública de Culqi es pública por diseño; la secreta nunca sale del servidor
            "culqi_public_key": (
                app.config["CULQI_PUBLIC_KEY"] if app.config["PAYMENT_PROVIDER"] == "culqi" else None
            ),
            "pickup_hours": app.config["PICKUP_CODE_EXPIRATION_HOURS"],
            "pending_ttl_minutes": app.config["PENDING_ORDER_TTL_MINUTES"],
            "currency": "PEN",
        })

    products_dir(app.config["UPLOAD_FOLDER"])  # crea la carpeta uploads/products si no existe

    with app.app_context():
        db.create_all()  # también crea las tablas nuevas (admin_keys, locker_events)

    start_alert_thread(app)
    init_mqtt(app)  # no hace nada si MQTT_HOST está vacío
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
