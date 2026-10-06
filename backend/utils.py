import base64
from functools import wraps
from io import BytesIO

import qrcode
from flask import jsonify
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
