from collections import defaultdict
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request, current_app

from extensions import db
from models import Order, OrderItem, Product, Locker, LockerBox
from services import cancel_paid_order
from utils import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

REVENUE_STATUSES = ["pagado", "retirado", "expirado"]


@admin_bp.get("/orders")
@admin_required
def list_orders():
    query = Order.query
    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status)
    orders = query.order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict(admin=True) for o in orders])


@admin_bp.post("/orders/<order_id>/cancel")
@admin_required
def cancel_order(order_id):
    """
    Cancela un pedido pendiente o pagado. Si estaba pagado, devuelve el stock,
    invalida el código QR y libera la caja.
    """
    order = Order.query.get_or_404(order_id)
    if order.status in ("retirado", "cancelado"):
        return jsonify({"error": f"El pedido ya está '{order.status}'"}), 400

    if order.status == "pagado":
        cancel_paid_order(order)
    else:  # pendiente_pago o expirado
        order.status = "cancelado"
    db.session.commit()
    return jsonify(order.to_dict(admin=True))


@admin_bp.get("/stats")
@admin_required
def stats():
    counts = {s: Order.query.filter_by(status=s).count() for s in
              ["pendiente_pago", "pagado", "retirado", "expirado", "cancelado"]}

    revenue_orders = Order.query.filter(Order.status.in_(REVENUE_STATUSES)).all()
    # "expirado" ya se cobró: el cliente pagó y no retiró
    ingresos = sum(float(o.total) for o in revenue_orders)

    # Ventas de los últimos 7 días (por fecha de pago, en hora local)
    offset = timedelta(hours=current_app.config["TZ_OFFSET_HOURS"])
    today = (datetime.utcnow() + offset).date()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]
    per_day = defaultdict(lambda: {"total": 0.0, "pedidos": 0})
    for o in revenue_orders:
        when = o.paid_at or o.created_at
        d = (when + offset).date()
        if d in days:
            per_day[d]["total"] += float(o.total)
            per_day[d]["pedidos"] += 1
    ventas_por_dia = [
        {"date": d.isoformat(), "total": round(per_day[d]["total"], 2),
         "pedidos": per_day[d]["pedidos"]}
        for d in days
    ]

    # Productos más vendidos
    sold = defaultdict(int)
    for o in revenue_orders:
        for item in o.items:
            sold[item.product_id] += item.quantity
    names = {p.id: p.name for p in Product.query.filter(Product.id.in_(list(sold) or [""])).all()}
    top_productos = sorted(
        ({"name": names.get(pid, "—"), "cantidad": qty} for pid, qty in sold.items()),
        key=lambda x: x["cantidad"], reverse=True,
    )[:5]

    boxes = LockerBox.query.all()
    cajas = {
        "libres": len([b for b in boxes if b.status == "libre"]),
        "ocupadas": len([b for b in boxes if b.status == "ocupado"]),
        "mantenimiento": len([b for b in boxes if b.status == "mantenimiento"]),
    }

    return jsonify({
        "total_ordenes": sum(counts.values()),
        "pagadas_esperando_retiro": counts["pagado"],
        "retiradas": counts["retirado"],
        "pendientes_pago": counts["pendiente_pago"],
        "expiradas": counts["expirado"],
        "canceladas": counts["cancelado"],
        "ingresos_totales": round(ingresos, 2),
        "productos_activos": Product.query.filter_by(active=True).count(),
        "lockers_activos": Locker.query.filter_by(active=True).count(),
        "ventas_por_dia": ventas_por_dia,
        "top_productos": top_productos,
        "cajas": cajas,
    })
