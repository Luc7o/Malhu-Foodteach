import time

from flask import Flask, jsonify, request

from config import Config
from extensions import db, jwt, cors
from services import expire_stale

from routes.auth import auth_bp
from routes.products import products_bp
from routes.lockers import lockers_bp
from routes.orders import orders_bp
from routes.locker_device import locker_device_bp
from routes.admin import admin_bp

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

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "app": "Malhu Foodtech"})

    @app.get("/api/config")
    def public_config():
        return jsonify({
            "payment_provider": app.config["PAYMENT_PROVIDER"],
            "pickup_hours": app.config["PICKUP_CODE_EXPIRATION_HOURS"],
            "pending_ttl_minutes": app.config["PENDING_ORDER_TTL_MINUTES"],
            "currency": "PEN",
        })

    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
