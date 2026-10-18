"""
Capa de pagos.

Proveedores:
- simulated: pago de prueba (no cobra dinero).
- izipay:    formulario incrustado de Izipay (tarjetas y los medios que tengas activados
             en tu contrato). El cobro lo hace el formulario en el navegador; el backend
             solo crea el formToken y confirma el resultado firmado (kr-answer / kr-hash).
- culqi:     Culqi Custom Checkout (tarjeta y Yape). El navegador tokeniza los datos en Culqi
             (nunca pasan por este servidor) y el backend crea el cargo con la llave secreta.

Se elige con PAYMENT_PROVIDER en el .env.
"""
import base64
import hashlib
import hmac
import json
import secrets

import requests

SIMULATED_METHODS = {"tarjeta", "yape", "plin"}


class PaymentError(Exception):
    pass


class PaymentUnknownError(PaymentError):
    """No sabemos si el cobro se hizo (tiempo agotado, error 5xx de la pasarela...)."""


class SimulatedProvider:
    name = "simulated"

    def __init__(self, config=None):
        pass

    def charge(self, order, method, payload=None):
        if method not in SIMULATED_METHODS:
            raise PaymentError("Método de pago no válido")
        return {"ref": "SIM-" + secrets.token_hex(4).upper(), "method": method}


def check_hash(kr_answer, kr_hash, key):
    """Valida la firma HMAC-SHA256 de kr-answer. Devuelve True/False."""
    if not (kr_answer and kr_hash and key):
        return False
    calculated = hmac.new(key.encode("utf-8"), kr_answer.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(calculated, kr_hash)


def parse_answer(raw_answer):
    """Normaliza el kr-answer de Izipay a un diccionario simple."""
    answer = json.loads(raw_answer) if isinstance(raw_answer, str) else (raw_answer or {})
    details = answer.get("orderDetails") or {}
    transactions = answer.get("transactions") or [{}]
    tx = transactions[0] or {}
    method_type = (tx.get("paymentMethodType") or "").upper()
    return {
        "paid": answer.get("orderStatus") == "PAID",
        "order_id": details.get("orderId"),
        "amount_cents": details.get("orderTotalAmount"),
        "currency": details.get("orderCurrency"),
        "transaction_uuid": tx.get("uuid"),
        "method": "tarjeta" if method_type in ("CARD", "") else method_type.lower(),
    }


class IzipayProvider:
    name = "izipay"

    def __init__(self, config):
        self.username = config.get("IZIPAY_USERNAME")
        self.password = config.get("IZIPAY_PASSWORD")
        self.public_key = config.get("IZIPAY_PUBLIC_KEY")
        self.hmac_key = config.get("IZIPAY_HMAC_KEY")
        self.api_url = config.get("IZIPAY_API_URL").rstrip("/")
        self.static_url = config.get("IZIPAY_STATIC_URL").rstrip("/")
        self.ipn_url = config.get("IZIPAY_IPN_URL")
        if not all([self.username, self.password, self.public_key, self.hmac_key]):
            raise PaymentError(
                "Faltan credenciales de Izipay (IZIPAY_USERNAME, IZIPAY_PASSWORD, "
                "IZIPAY_PUBLIC_KEY, IZIPAY_HMAC_KEY)."
            )

    def charge(self, order, method, payload=None):
        raise PaymentError("Con Izipay el pago se hace desde el formulario de pago.")

    def create_form_token(self, order, user):
        """Crea el formToken (Charge/CreatePayment) para mostrar el formulario."""
        body = {
            "amount": int(round(float(order.total) * 100)),  # en céntimos
            "currency": "PEN",
            "orderId": order.id,
            "customer": {
                "email": getattr(user, "contact_email", None) or user.email,
                "billingDetails": {"firstName": user.name},
            },
        }
        if self.ipn_url:
            body["ipnTargetUrl"] = self.ipn_url
        auth = base64.b64encode(f"{self.username}:{self.password}".encode("utf-8")).decode("utf-8")
        try:
            resp = requests.post(
                f"{self.api_url}/api-payment/V4/Charge/CreatePayment",
                json=body,
                headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json"},
                timeout=15,
            )
            data = resp.json()
        except (requests.RequestException, ValueError):
            raise PaymentError("No pudimos conectar con Izipay. Intenta de nuevo en unos minutos.")
        if data.get("status") != "SUCCESS":
            detail = (data.get("answer") or {}).get("errorMessage", "error desconocido")
            raise PaymentError(f"Izipay rechazó la solicitud: {detail}")
        return data["answer"]["formToken"]

    def public_info(self):
        return {"publicKey": self.public_key, "endpoint": self.static_url}


class CulqiProvider:
    """
    Culqi: el Custom Checkout del navegador entrega un token (tkn_...) y aquí se crea el
    cargo (POST /v2/charges) con la llave secreta. Cubre tarjeta y Yape (ambos son token).
    Pendiente: 3D Secure (Culqi3DS), PagoEfectivo/billeteras/Cuotéalo (usan órdenes + webhook).
    """
    name = "culqi"

    def __init__(self, config):
        self.public_key = (config.get("CULQI_PUBLIC_KEY") or "").strip()
        self.secret_key = (config.get("CULQI_SECRET_KEY") or "").strip()
        self.api_url = (config.get("CULQI_API_URL") or "https://api.culqi.com").rstrip("/")
        if not (self.public_key and self.secret_key):
            raise PaymentError("Faltan credenciales de Culqi (CULQI_PUBLIC_KEY, CULQI_SECRET_KEY).")
        if not self.public_key.startswith("pk_") or not self.secret_key.startswith("sk_"):
            raise PaymentError(
                "Las llaves de Culqi no tienen el formato esperado (pk_test_... / sk_test_...)."
            )
        if ("_test_" in self.public_key) != ("_test_" in self.secret_key):
            raise PaymentError(
                "Las llaves de Culqi mezclan modo integración (test) con producción (live)."
            )

    def public_info(self):
        return {"publicKey": self.public_key}

    def charge(self, order, method, payload=None):
        payload = payload or {}
        token_id = str(payload.get("token_id") or "").strip()
        # Tarjeta -> tkn_...   |   Yape -> ype_...  (ambos sirven como source_id del cargo)
        if not token_id.startswith(("tkn_", "ype_")):
            raise PaymentError("No recibimos los datos del pago. Vuelve a intentarlo.")
        is_yape = token_id.startswith("ype_")
        email = payload.get("email")
        if not email:
            raise PaymentError("Tu cuenta no tiene un correo para emitir el pago.")

        body = {
            "amount": int(round(float(order.total) * 100)),  # en céntimos
            "currency_code": "PEN",
            "email": email,
            "source_id": token_id,
            "capture": True,
            "description": f"Pedido MALHU {str(order.id)[:8]}",
            "metadata": {"order_id": str(order.id)},
        }
        try:
            resp = requests.post(
                f"{self.api_url}/v2/charges",
                json=body,
                headers={
                    "Authorization": f"Bearer {self.secret_key}",
                    "Content-Type": "application/json",
                },
                timeout=25,
            )
        except requests.RequestException:
            raise PaymentUnknownError(
                "No pudimos confirmar el pago con Culqi. Si te cobraron, escríbenos y lo revisamos."
            )
        try:
            data = resp.json()
        except ValueError:
            data = {}
        if not isinstance(data, dict):
            data = {}

        if resp.status_code >= 500:
            raise PaymentUnknownError(
                "Culqi no respondió bien. Si te cobraron, escríbenos y lo revisamos."
            )
        if resp.status_code == 200:
            # Culqi responde 200 (no 201) cuando el banco exige autenticación 3D Secure
            raise PaymentError(
                "Tu banco pidió una verificación 3D Secure que aún no está habilitada en la tienda. "
                "Prueba con otra tarjeta o con Yape."
            )
        if resp.status_code != 201:
            detail = data.get("user_message") or data.get("merchant_message") or "el pago fue rechazado"
            raise PaymentError(f"No se pudo cobrar: {detail}")

        outcome = data.get("outcome") or {}
        approved = "venta_exitosa" in (outcome.get("type"), data.get("response_code"))
        if data.get("object") != "charge" or not data.get("id") or not approved:
            raise PaymentUnknownError(
                "No pudimos confirmar el pago con Culqi. Si te cobraron, escríbenos y lo revisamos."
            )
        source_type = ((data.get("source") or {}).get("type") or "").lower()
        return {"ref": data["id"], "method": "yape" if (is_yape or source_type == "yape") else "tarjeta"}


PROVIDERS = {"simulated": SimulatedProvider, "izipay": IzipayProvider, "culqi": CulqiProvider}


def get_provider(name, config=None):
    cls = PROVIDERS.get(name)
    if not cls:
        raise PaymentError(
            f"La pasarela '{name}' no está configurada. Usa PAYMENT_PROVIDER=simulated, izipay o culqi."
        )
    return cls(config or {})
