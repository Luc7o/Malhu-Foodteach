"""
Capa de pagos. Hoy solo existe el proveedor 'simulated' (pago de prueba).

Para conectar una pasarela real (Culqi, Niubiz, Mercado Pago, etc.):
1. Crea una clase con un método `charge(order, method, payload)` que cobre el monto
   `order.total` y devuelva una referencia de la transacción.
2. Regístrala en PROVIDERS y pon PAYMENT_PROVIDER=<nombre> en el .env.
El resto del flujo (asignar caja, generar QR, descontar stock) no cambia.
"""
import secrets

SIMULATED_METHODS = {"tarjeta", "yape", "plin"}


class PaymentError(Exception):
    pass


class SimulatedProvider:
    name = "simulated"

    def charge(self, order, method, payload=None):
        if method not in SIMULATED_METHODS:
            raise PaymentError("Método de pago no válido")
        return {"ref": "SIM-" + secrets.token_hex(4).upper(), "method": method}


PROVIDERS = {"simulated": SimulatedProvider}


def get_provider(name):
    cls = PROVIDERS.get(name)
    if not cls:
        raise PaymentError(
            f"La pasarela '{name}' no está configurada. Usa PAYMENT_PROVIDER=simulated."
        )
    return cls()
