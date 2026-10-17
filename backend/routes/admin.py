from collections import defaultdict
from datetime import date, datetime, timedelta

import pyotp
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import case, func, or_
from sqlalchemy.orm import selectinload

from extensions import db
from models import Locker, LockerBox, Order, OrderItem, Product, User
from routes.auth import verify_totp
from security import clear_attempts, lock_message, minutes_locked, register_failure
from services import cancel_paid_order
from utils import (
    admin_required, csv_response, local_day_start_utc, local_dt, page_args, paged, qr_data_url,
)

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

REVENUE_STATUSES = ["pagado", "retirado", "expirado"]
ORDER_STATUSES = ["pendiente_pago", "pagado", "retirado", "expirado", "cancelado"]

# días del periodo -> cómo se agrupan las ventas
RANGES = {7: "day", 30: "day", 90: "week", 365: "month"}


# ====================================================================== pedidos
def _parse_day(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ValueError("Las fechas deben tener el formato AAAA-MM-DD")


def _orders_query():
    """Pedidos con los filtros de la URL: status, locker_id, q, date_from, date_to."""
    args = request.args
    query = Order.query.join(User, Order.user_id == User.id)

    status = args.get("status")
    if status in ORDER_STATUSES:
        query = query.filter(Order.status == status)
    if args.get("locker_id"):
        query = query.filter(Order.locker_id == args["locker_id"])

    text = (args.get("q") or "").strip()
    if text:
        like = f"%{text}%"
        query = query.filter(or_(
            Order.id.ilike(f"{text}%"), User.name.ilike(like), User.email.ilike(like),
        ))

    start, end = _parse_day(args.get("date_from")), _parse_day(args.get("date_to"))
    if start:
        query = query.filter(Order.created_at >= local_day_start_utc(start))
    if end:
        query = query.filter(Order.created_at < local_day_start_utc(end + timedelta(days=1)))
    return query


def _with_relations(query):
    return query.options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.user),
        selectinload(Order.locker),
        selectinload(Order.pickup_code),
    )


@admin_bp.get("/orders")
@admin_required
def list_orders():
    try:
        base = _orders_query()
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    page, per_page = page_args(request.args)

    total = base.count()
    monto = (
        base.filter(Order.status.in_(REVENUE_STATUSES))
        .with_entities(func.coalesce(func.sum(Order.total), 0))
        .scalar()
    )
    rows = (
        _with_relations(base)
        .order_by(Order.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    out = paged(total, page, per_page, [o.to_dict(admin=True) for o in rows])
    out["summary"] = {"monto": round(float(monto or 0), 2)}
    return jsonify(out)


@admin_bp.get("/orders/<order_id>")
@admin_required
def order_detail(order_id):
    order = Order.query.get_or_404(order_id)
    return jsonify(order.to_dict(admin=True))


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


# ====================================================================== estadísticas
def _bucket(day, granularity):
    if granularity == "day":
        return day
    if granularity == "week":
        return day - timedelta(days=day.weekday())  # lunes de esa semana
    return day.replace(day=1)


def _variation(current, previous):
    if not previous:
        return None
    return round((current - previous) / previous * 100, 1)


@admin_bp.get("/stats")
@admin_required
def stats():
    """
    Resumen del negocio. ?range=7|30|90|365 elige el periodo del gráfico y los KPIs
    (7 y 30 días se agrupan por día, 90 por semana y 365 por mes).
    """
    try:
        days = int(request.args.get("range", 7))
    except (TypeError, ValueError):
        days = 7
    if days not in RANGES:
        days = 7
    granularity = RANGES[days]

    today = local_dt(datetime.utcnow()).date()
    start = today - timedelta(days=days - 1)
    prev_start = start - timedelta(days=days)

    # ---------- totales de siempre (por estado)
    counts = {s: Order.query.filter_by(status=s).count() for s in ORDER_STATUSES}
    ingresos_totales = (
        db.session.query(func.coalesce(func.sum(Order.total), 0))
        .filter(Order.status.in_(REVENUE_STATUSES)).scalar()
    )

    # ---------- pedidos cobrados del periodo actual y del anterior
    when = func.coalesce(Order.paid_at, Order.created_at)
    orders = (
        Order.query.options(
            selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.category_ref)
        )
        .filter(Order.status.in_(REVENUE_STATUSES), when >= local_day_start_utc(prev_start))
        .all()
    )

    buckets = []
    for i in range(days):
        key = _bucket(start + timedelta(days=i), granularity)
        if key not in buckets:
            buckets.append(key)
    series = {b: {"total": 0.0, "pedidos": 0} for b in buckets}
    per_hour = [{"hora": h, "pedidos": 0, "total": 0.0} for h in range(24)]
    by_product = defaultdict(lambda: {"cantidad": 0, "ingresos": 0.0})
    by_category = defaultdict(lambda: {"cantidad": 0, "ingresos": 0.0})
    cur_total = cur_n = prev_total = prev_n = 0

    for o in orders:
        moment = local_dt(o.paid_at or o.created_at)
        day = moment.date()
        amount = float(o.total)
        if start <= day <= today:
            cur_total += amount
            cur_n += 1
            series[_bucket(day, granularity)]["total"] += amount
            series[_bucket(day, granularity)]["pedidos"] += 1
            per_hour[moment.hour]["pedidos"] += 1
            per_hour[moment.hour]["total"] += amount
            for item in o.items:
                revenue = float(item.unit_price) * item.quantity
                name = item.product.name if item.product else "—"
                by_product[name]["cantidad"] += item.quantity
                by_product[name]["ingresos"] += revenue
                cat = (item.product.category_name() if item.product else None) or "Sin categoría"
                by_category[cat]["cantidad"] += item.quantity
                by_category[cat]["ingresos"] += revenue
        elif prev_start <= day < start:
            prev_total += amount
            prev_n += 1

    top_productos = sorted(
        ({"name": n, "cantidad": v["cantidad"], "ingresos": round(v["ingresos"], 2)} for n, v in by_product.items()),
        key=lambda x: x["cantidad"], reverse=True,
    )[:5]
    por_categoria = sorted(
        ({"name": n, "cantidad": v["cantidad"], "ingresos": round(v["ingresos"], 2)} for n, v in by_category.items()),
        key=lambda x: x["ingresos"], reverse=True,
    )

    # ---------- lockers y alertas
    boxes = LockerBox.query.all()
    cajas = {
        "libres": len([b for b in boxes if b.status == "libre"]),
        "ocupadas": len([b for b in boxes if b.status == "ocupado"]),
        "mantenimiento": len([b for b in boxes if b.status == "mantenimiento"]),
    }
    lockers = []
    for l in Locker.query.filter_by(active=True).order_by(Locker.name).all():
        lockers.append({
            "id": l.id, "name": l.name, "online": l.is_online(),
            "last_seen": l.last_seen.isoformat() + "Z" if l.last_seen else None,
            "total": len(l.boxes),
            "libres": len([b for b in l.boxes if b.status == "libre"]),
            "ocupadas": len([b for b in l.boxes if b.status == "ocupado"]),
            "mantenimiento": len([b for b in l.boxes if b.status == "mantenimiento"]),
        })

    threshold = current_app.config["LOW_STOCK_THRESHOLD"]
    published = Product.query.filter_by(status="publicado").order_by(Product.stock, Product.name).all()
    stock_bajo = [
        {"id": p.id, "name": p.name, "stock": p.stock} for p in published if 0 < p.stock <= threshold
    ]
    agotados = [
        {"id": p.id, "name": p.name, "stock": p.stock, "manual": bool(p.sold_out)}
        for p in published if p.is_out_of_stock()
    ]
    sin_senal = [
        {"id": l["id"], "name": l["name"], "last_seen": l["last_seen"]}
        for l in lockers if not l["online"] and l["last_seen"]
    ]

    return jsonify({
        # ----- totales de siempre
        "total_ordenes": sum(counts.values()),
        "pagadas_esperando_retiro": counts["pagado"],
        "retiradas": counts["retirado"],
        "pendientes_pago": counts["pendiente_pago"],
        "expiradas": counts["expirado"],
        "canceladas": counts["cancelado"],
        "ingresos_totales": round(float(ingresos_totales or 0), 2),
        "productos_activos": Product.query.filter_by(active=True).count(),
        "lockers_activos": Locker.query.filter_by(active=True).count(),
        "cajas": cajas,
        # ----- periodo elegido
        "range": days,
        "granularity": granularity,
        "periodo": {
            "ingresos": round(cur_total, 2),
            "pedidos": cur_n,
            "ticket_promedio": round(cur_total / cur_n, 2) if cur_n else 0,
            "ingresos_anterior": round(prev_total, 2),
            "pedidos_anterior": prev_n,
            "variacion_ingresos": _variation(cur_total, prev_total),
            "variacion_pedidos": _variation(cur_n, prev_n),
        },
        "ventas": [
            {"date": b.isoformat(), "total": round(v["total"], 2), "pedidos": v["pedidos"]}
            for b, v in series.items()
        ],
        "por_hora": [{"hora": h["hora"], "pedidos": h["pedidos"], "total": round(h["total"], 2)} for h in per_hour],
        "top_productos": top_productos,
        "por_categoria": por_categoria,
        "lockers": lockers,
        "alertas": {
            "stock_bajo": stock_bajo[:10],
            "agotados": agotados[:10],
            "lockers_sin_senal": sin_senal,
            "cajas_mantenimiento": cajas["mantenimiento"],
            "umbral_stock": threshold,
        },
    })


# ====================================================================== clientes
def _customers_query():
    spent = (
        db.session.query(
            Order.user_id.label("user_id"),
            func.count(Order.id).label("n"),
            func.coalesce(func.sum(case((Order.status.in_(REVENUE_STATUSES), Order.total), else_=0)), 0).label("spent"),
            func.max(Order.created_at).label("last_order"),
        )
        .group_by(Order.user_id)
        .subquery()
    )
    query = (
        db.session.query(User, spent.c.n, spent.c.spent, spent.c.last_order)
        .outerjoin(spent, spent.c.user_id == User.id)
        .filter(User.role == "cliente")
    )

    text = (request.args.get("q") or "").strip()
    if text:
        like = f"%{text}%"
        query = query.filter(or_(User.name.ilike(like), User.email.ilike(like)))
    status = request.args.get("status")
    if status == "activos":
        query = query.filter(User.active.is_(True))
    elif status == "inactivos":
        query = query.filter(User.active.is_(False))

    sort = request.args.get("sort", "reciente")
    if sort == "gasto":
        query = query.order_by(func.coalesce(spent.c.spent, 0).desc(), User.name)
    elif sort == "pedidos":
        query = query.order_by(func.coalesce(spent.c.n, 0).desc(), User.name)
    elif sort == "nombre":
        query = query.order_by(User.name)
    else:
        query = query.order_by(User.created_at.desc())
    return query


def _customer_dict(user, n, spent, last_order):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "active": bool(user.active),
        "created_at": user.created_at.isoformat() + "Z" if user.created_at else None,
        "last_login_at": user.last_login_at.isoformat() + "Z" if user.last_login_at else None,
        "orders_count": int(n or 0),
        "total_spent": round(float(spent or 0), 2),
        "last_order_at": last_order.isoformat() + "Z" if last_order else None,
    }


@admin_bp.get("/customers")
@admin_required
def list_customers():
    page, per_page = page_args(request.args)
    query = _customers_query()
    total = query.count()
    rows = query.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify(paged(total, page, per_page, [_customer_dict(*r) for r in rows]))


@admin_bp.get("/customers/<user_id>")
@admin_required
def customer_detail(user_id):
    user = User.query.filter_by(id=user_id, role="cliente").first_or_404()
    orders = (
        _with_relations(Order.query.filter_by(user_id=user.id))
        .order_by(Order.created_at.desc()).limit(50).all()
    )
    n, spent, last_order = (
        db.session.query(
            func.count(Order.id),
            func.coalesce(func.sum(case((Order.status.in_(REVENUE_STATUSES), Order.total), else_=0)), 0),
            func.max(Order.created_at),
        ).filter(Order.user_id == user.id).one()
    )
    data = _customer_dict(user, n, spent, last_order)
    data["orders"] = [o.to_dict(admin=True) for o in orders]
    return jsonify(data)


@admin_bp.patch("/customers/<user_id>")
@admin_required
def update_customer(user_id):
    """Activa o desactiva la cuenta de un cliente. Body: {"active": false}"""
    user = User.query.filter_by(id=user_id, role="cliente").first_or_404()
    data = request.get_json() or {}
    if "active" not in data:
        return jsonify({"error": "active es requerido"}), 400
    user.active = bool(data["active"])
    db.session.commit()
    return jsonify({"id": user.id, "active": user.active})


# ====================================================================== exportar a CSV
def _stamp():
    return local_dt(datetime.utcnow()).strftime("%Y-%m-%d")


def _fmt(dt):
    return local_dt(dt).strftime("%Y-%m-%d %H:%M") if dt else ""


@admin_bp.get("/export/orders")
@admin_required
def export_orders():
    """Pedidos en CSV (respeta los mismos filtros que la lista: status, q, fechas, locker)."""
    try:
        query = _orders_query()
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    orders = _with_relations(query).order_by(Order.created_at.desc()).limit(50000).all()
    rows = []
    for o in orders:
        d = o.to_dict(admin=True)
        productos = "; ".join(i.describe() for i in o.items if i.product)
        rows.append([
            o.id[:8].upper(), _fmt(o.created_at), d["customer_name"], d["customer_email"],
            d["locker_name"], d.get("box_number") or "", o.status, o.payment_method or "",
            f"{float(o.total):.2f}", productos,
        ])
    return csv_response(
        f"pedidos-{_stamp()}.csv",
        ["Pedido", "Fecha", "Cliente", "Correo", "Locker", "Caja", "Estado", "Método de pago", "Total (S/.)", "Productos"],
        rows,
    )


@admin_bp.get("/export/products")
@admin_required
def export_products():
    products = Product.query.order_by(Product.name).all()
    rows = [
        [p.name, p.category_name() or "", f"{float(p.price):.2f}", p.stock, p.status,
         "Sí" if p.featured else "No", "Sí" if p.is_out_of_stock() else "No",
         "; ".join(t.name for t in p.sorted_health_tags()),
         p.calories if p.calories is not None else "",
         "Sí" if p.ingredient_only else "No",
         "Sí" if p.is_customizable() else "No"]
        for p in products
    ]
    return csv_response(
        f"productos-{_stamp()}.csv",
        ["Nombre", "Categoría", "Precio (S/.)", "Stock", "Estado", "Destacado", "Agotado", "Etiquetas de salud", "Calorías (kcal)", "Solo ingrediente", "Personalizable"],
        rows,
    )


@admin_bp.get("/export/customers")
@admin_required
def export_customers():
    rows = []
    for user, n, spent, last_order in _customers_query().limit(50000).all():
        rows.append([
            user.name, user.email, _fmt(user.created_at), _fmt(user.last_login_at),
            int(n or 0), f"{float(spent or 0):.2f}", "Activa" if user.active else "Desactivada",
        ])
    return csv_response(
        f"clientes-{_stamp()}.csv",
        ["Nombre", "Correo", "Registro", "Último acceso", "Pedidos", "Gastado (S/.)", "Cuenta"],
        rows,
    )


# ====================================================================== seguridad (2FA)
def _me():
    return User.query.get_or_404(get_jwt_identity())


@admin_bp.get("/security")
@admin_required
def security_status():
    user = _me()
    return jsonify({
        "totp_enabled": bool(user.totp_enabled),
        "last_login_at": user.last_login_at.isoformat() + "Z" if user.last_login_at else None,
    })


@admin_bp.post("/security/2fa/setup")
@admin_required
def twofa_setup():
    """Genera un secreto nuevo y su QR. No queda activo hasta confirmar con un código."""
    user = _me()
    if user.totp_enabled:
        return jsonify({"error": "La verificación en dos pasos ya está activa"}), 409
    user.totp_secret = pyotp.random_base32()
    db.session.commit()
    uri = pyotp.TOTP(user.totp_secret).provisioning_uri(
        name=user.email, issuer_name=current_app.config["TOTP_ISSUER"]
    )
    return jsonify({"secret": user.totp_secret, "otpauth_uri": uri, "qr_image_base64": qr_data_url(uri)})


@admin_bp.post("/security/2fa/enable")
@admin_required
def twofa_enable():
    user = _me()
    key = f"2fa:{user.id}"
    wait = minutes_locked(key)
    if wait:
        return jsonify({"error": lock_message(wait)}), 429
    if user.totp_enabled:
        return jsonify({"error": "La verificación en dos pasos ya está activa"}), 409
    if not user.totp_secret:
        return jsonify({"error": "Primero genera el código QR"}), 400
    if not verify_totp(user, (request.get_json() or {}).get("code")):
        if register_failure(key):
            return jsonify({"error": lock_message(minutes_locked(key))}), 429
        return jsonify({"error": "Código incorrecto. Revisa la hora de tu teléfono e inténtalo de nuevo."}), 400
    user.totp_enabled = True
    db.session.commit()
    clear_attempts(key)
    return jsonify({"totp_enabled": True})


@admin_bp.post("/security/2fa/disable")
@admin_required
def twofa_disable():
    user = _me()
    key = f"2fa:{user.id}"
    wait = minutes_locked(key)
    if wait:
        return jsonify({"error": lock_message(wait)}), 429
    data = request.get_json() or {}
    if not user.totp_enabled:
        return jsonify({"error": "La verificación en dos pasos no está activa"}), 400
    if not user.check_password(data.get("password") or "") or not verify_totp(user, data.get("code")):
        if register_failure(key):
            return jsonify({"error": lock_message(minutes_locked(key))}), 429
        return jsonify({"error": "Contraseña o código incorrectos"}), 400
    user.totp_enabled = False
    user.totp_secret = None
    db.session.commit()
    clear_attempts(key)
    return jsonify({"totp_enabled": False})
