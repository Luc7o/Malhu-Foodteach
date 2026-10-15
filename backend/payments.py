"""
Capa de pagos.

Proveedores:
- simulated: pago de prueba (no cobra dinero).
- izipay:    formulario incrustado de Izipay (tarjetas y los medios que tengas activados
             en tu contrato). El cobro lo hace el formulario en el navegador; el backend
             solo crea el formToken y confirma el resultado firmado (kr-answer / kr-hash).

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
                "email": user.email,
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


PROVIDERS = {"simulated": SimulatedProvider, "izipay": IzipayProvider}


def get_provider(name, config=None):
    cls = PROVIDERS.get(name)
    if not cls:
        raise PaymentError(
            f"La pasarela '{name}' no está configurada. Usa PAYMENT_PROVIDER=simulated o izipay."
        )
    return cls(config or {})
