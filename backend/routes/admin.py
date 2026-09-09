from flask import Blueprint, jsonify

from models import Order, Product, Locker
from utils import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/orders")
@admin_required
def list_orders():
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@admin_bp.get("/stats")
@admin_required
def stats():
    total_orders = Order.query.count()
    pagadas = Order.query.filter_by(status="pagado").count()
    retiradas = Order.query.filter_by(status="retirado").count()
    pendientes = Order.query.filter_by(status="pendiente_pago").count()

    ingresos = sum(
        float(o.total) for o in Order.query.filter(Order.status.in_(["pagado", "retirado"])).all()
    )

    return jsonify({
        "total_ordenes": total_orders,
        "pagadas_esperando_retiro": pagadas,
        "retiradas": retiradas,
        "pendientes_pago": pendientes,
        "ingresos_totales": ingresos,
        "productos_activos": Product.query.filter_by(active=True).count(),
        "lockers_activos": Locker.query.filter_by(active=True).count(),
    })
