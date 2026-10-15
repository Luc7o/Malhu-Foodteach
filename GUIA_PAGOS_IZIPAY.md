# Pagos con Izipay y avisos por correo: puesta en marcha

## 1. Instalar lo nuevo
1. Backend: dentro de `backend`, ejecuta `pip install -r requirements.txt` (se agregó `requests`).
2. Frontend: dentro de `frontend`, ejecuta `npm install` (se agregó `@lyracom/embedded-form-glue`).

## 2. Credenciales de Izipay
1. Entra al Back Office Vendedor de Izipay y copia tus claves de API REST: identificador de tienda,
   clave (password), clave pública y clave HMAC-SHA-256. Cada una tiene versión TEST y PRODUCCIÓN.
2. Abre `backend/.env.izipay.example`, copia su contenido a `backend/.env` y pega tus claves de TEST.
3. Reinicia el backend. Con `PAYMENT_PROVIDER=izipay` el pedido muestra el formulario de Izipay
   en lugar de los botones de prueba.

## 3. Probar en modo TEST
1. Haz un pedido y llega a "Paga tu pedido": debe cargar el formulario de Izipay.
2. Paga con una tarjeta de prueba (están en la documentación de Izipay; no se cobra dinero).
3. Al aprobarse, el pedido pasa a "Pagado", aparece el QR y llega el correo.

## 4. IPN (respaldo si el cliente cierra la ventana al pagar)
1. Necesita una dirección pública con https; en tu computadora (localhost) Izipay no puede llamarla.
2. En el Back Office: Configuración, Reglas de notificación, "URL de notificación al final del pago".
3. Escribe `https://TU-DOMINIO/api/izipay/ipn`.
Sin la IPN, el pago igual se confirma cuando el cliente termina en la pantalla.

## 5. Avisos por correo
1. Completa las variables `MAIL_*` y `ADMIN_ALERT_EMAILS` en `backend/.env`.
2. Con Gmail necesitas activar la verificación en dos pasos y crear una "contraseña de aplicación".
3. Cliente: recibe su QR cuando el pedido queda en la caja.
4. Administrador: pedido nuevo, locker sin señal (y cuando vuelve), producto por agotarse o agotado,
   y pagos que hay que reembolsar.

## 6. Pasar a producción
1. Cambia las 4 claves de TEST por las de PRODUCCIÓN en `.env`.
2. Configura la IPN con tu dominio real.
3. Haz un pago real pequeño para comprobar todo el recorrido.

## Pruebas automáticas
`python test_izipay.py` (simula Izipay y los correos; no usa internet).
