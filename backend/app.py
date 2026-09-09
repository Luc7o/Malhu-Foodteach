from flask import Flask, jsonify

from config import Config
from extensions import db, jwt, cors

from routes.auth import auth_bp
from routes.products import products_bp
from routes.lockers import lockers_bp
from routes.orders import orders_bp
from routes.locker_device import locker_device_bp
from routes.admin import admin_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app)  # en desarrollo permite todos los orígenes; ajustar para producción

    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(lockers_bp)
    app.register_blueprint(orders_bp)
    app.register_blueprint(locker_device_bp)
    app.register_blueprint(admin_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "app": "Malhu Foodtech"})

    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
