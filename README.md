# Malhu Foodtech — Prototipo web (Flask + React + MySQL/Postgres)

> Para publicarlo en internet (Vercel + Railway) mira **[DEPLOY.md](DEPLOY.md)**.

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
source venv/bin/activate        # en Windows: venv\Scripts\activate
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

## Diseño y funcionalidades del frontend (actualizado)

El frontend ahora usa **Tailwind CSS** con un diseño propio (marca "Malhu
Foodtech", paleta naranja/food-tech, tipografía Poppins). Se agregaron:

- Catálogo: buscador, orden por precio/nombre, selector de cantidad,
  badges de "sin stock" / "poco stock", skeletons de carga.
- Carrito: controles +/- de cantidad, carrito persistente (localStorage),
  selección de locker con disponibilidad de cajas, resumen de pedido.
- Notificaciones tipo *toast* para acciones (agregar al carrito, pagar,
  errores, etc).
- Mis pedidos: filtros por estado, badges de estado, copiar código QR con
  un clic.
- Navbar responsive con menú móvil y contador de carrito.
- Panel admin: dashboard con tarjetas e íconos, modal para crear/editar
  productos (con preview de imagen y toggle activo/inactivo), tabla de
  productos con búsqueda, tabla de órdenes con filtros por estado y
  búsqueda por ID/código.
- Página 404 y estados vacíos (empty states) en todas las listas.

No se modificó el backend (Flask); todo lo anterior consume los mismos
endpoints ya existentes.

## Imágenes de productos (subida desde el panel admin)

En **Admin → Productos → Nuevo/Editar** ahora puedes subir la foto del producto
desde tu equipo (JPG, PNG, WEBP o GIF, máx. 5 MB). También sigue funcionando
pegar una URL.

- Endpoint: `POST /api/admin/upload` (solo admin, `multipart/form-data`, campo `image`)
  → devuelve `{ "url": "http://.../api/uploads/<archivo>" }`
- Las imágenes se guardan en `backend/uploads/` y se sirven en `GET /api/uploads/<archivo>`
- Se valida el contenido real del archivo y se reducen a 1200 px como máximo
- Variables opcionales en `.env`: `MAX_UPLOAD_MB`, `UPLOAD_FOLDER`,
  `PUBLIC_BASE_URL` (ponla en producción, ej. `https://api.tudominio.com`)
- Instala la dependencia nueva: `pip install -r requirements.txt` (Pillow)
