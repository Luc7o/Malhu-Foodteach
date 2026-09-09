# Malhu Foodtech — Prototipo web (Flask + React + MySQL)

Backend probado end-to-end: registro/login, CRUD de productos, creación de
locker con cajas, creación de orden, pago simulado, generación de QR,
y validación del código (la llamada que hará el ESP32).

## 1. Backend (Flask)

### Requisitos previos
- Python 3.10+
- MySQL corriendo localmente

### Pasos

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Crea la base de datos en MySQL:

```bash
mysql -u root -p < create_database.sql
```

Copia el archivo de variables de entorno y ajústalo con tu password de MySQL:

```bash
cp .env.example .env
# edita .env con tu editor y pon tu password real de MySQL
```

Corre el backend (esto crea las tablas automáticamente):

```bash
python app.py
```

Deberías ver el servidor en `http://localhost:5000`. Prueba en el navegador:
`http://localhost:5000/api/health`

Opcional — crea datos de prueba (usuario admin, un locker, productos):

```bash
python seed.py
```

Esto crea:
- Admin: `admin@malhu.com` / `admin123`
- Locker con `device_id = "LOCKER-001"` — **usa este mismo device_id en el
  firmware del ESP32** para que el backend lo reconozca
- 3 productos de ejemplo

## 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. Ya está configurado para hablar con el backend
en `http://localhost:5000` (ver `src/api.js` si cambias el puerto).

## 3. Flujo para probar todo junto

1. Entra como cliente (o regístrate), agrega productos al carrito
2. En el carrito, elige el locker y confirma el pedido
3. Ve a "Mis pedidos" y dale a "Simular pago" — esto genera el QR
4. El QR contiene un código tipo `MLH-XXXXXXXXXX`
5. Ese mismo código es el que el ESP32 le va a mandar al backend cuando el
   escáner lo lea, contra este endpoint:

   ```
   POST /api/locker/validate
   { "device_id": "LOCKER-001", "code": "MLH-XXXXXXXXXX" }
   ```

   El backend responde `{"valid": true, "box_number": 1}` y ahí es donde el
   firmware del ESP32 decide activar el relé/servo de esa caja.

## Próximos pasos pendientes

- Actualizar el firmware del ESP32 para que, en vez de servir su propia
  página (modo Access Point), se conecte a una red WiFi con internet y
  llame a `POST /api/locker/validate` cuando el escáner QR lea un código
- Reemplazar el "pago simulado" por una pasarela real
- Diseño visual del frontend (por ahora es 100% funcional, sin estilos)
