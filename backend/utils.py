import base64
import csv
from datetime import datetime, timedelta
from functools import wraps
from io import BytesIO, StringIO

import qrcode
from flask import Response, current_app, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"error": "Se requiere rol de administrador"}), 403
        return fn(*args, **kwargs)
    return wrapper


def qr_data_url(text):
    """Devuelve un QR como imagen PNG en base64 (data URL) listo para un <img>."""
    img = qrcode.make(text)
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def page_args(args, default=20, maximum=100):
    """Lee ?page= y ?per_page= de la URL con límites sensatos."""
    try:
        page = max(1, int(args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per_page = min(maximum, max(1, int(args.get("per_page", default))))
    except (TypeError, ValueError):
        per_page = default
    return page, per_page


def paged(total, page, per_page, items):
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, -(-total // per_page)),
    }


def local_dt(dt):
    """Fecha UTC de la base de datos -> hora local del negocio (TZ_OFFSET_HOURS)."""
    if not dt:
        return None
    return dt + timedelta(hours=current_app.config["TZ_OFFSET_HOURS"])


def local_day_start_utc(day):
    """Medianoche local de `day` (date) expresada en UTC, para filtrar por fecha."""
    return datetime(day.year, day.month, day.day) - timedelta(hours=current_app.config["TZ_OFFSET_HOURS"])


def _csv_cell(value):
    if value is None:
        return ""
    text = str(value)
    # Evita que Excel interprete un texto como fórmula (=, +, -, @)
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text
    return text


def csv_response(filename, header, rows):
    """CSV con BOM UTF-8 para que Excel muestre bien las tildes y la ñ."""
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    for row in rows:
        writer.writerow([_csv_cell(c) for c in row])
    body = "\ufeff" + buffer.getvalue()
    return Response(
        body,
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
