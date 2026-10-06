# Malhu Foodtech — cambios de esta versión

Copia cada archivo sobre el del mismo nombre en tu proyecto (la estructura de carpetas es la misma).

## Archivos

Backend (`backend/`)
- `app.py`, `config.py`, `models.py`, `utils.py`  (modificados)
- `routes/locker_device.py`, `routes/lockers.py`, `routes/products.py`  (modificados)
- `images.py`  (NUEVO: valida, reduce y guarda las fotos de productos)
- `requirements.txt`  (agrega Pillow)
- `test_nuevas_funciones.py`  (NUEVO: pruebas de todo lo de abajo)

Frontend (`frontend/src/`)
- `api.js`, `components/ui.jsx`, `pages/admin/AdminLockers.jsx`, `pages/admin/AdminProducts.jsx`  (modificados)

ESP32 (`firmware/`)
- `locker_malhu_v3.ino`  (NUEVO firmware, reemplaza a locker_malhu_pc.ino)

## Cómo aplicarlo

1. Detén el backend y copia los archivos.
2. `cd backend` y `pip install -r requirements.txt`  (instala Pillow).
3. Reinicia con `python app.py`. Las tablas nuevas (`admin_keys`, `locker_events`) se crean solas;
   NO hace falta correr migrate.py. Se crea también la carpeta `backend/uploads/`.
4. Frontend: `npm run dev` como siempre (no hay dependencias nuevas).
5. Sube `locker_malhu_v3.ino` al ESP32.
6. Opcional: `python test_nuevas_funciones.py` (usa SQLite en memoria, no toca tu MySQL).

## 1. Llave digital del admin
Panel → Lockers → botón "Llave" en cada caja → eliges la duración (5 a 60 min) y, si quieres,
"un solo uso" → sale un QR. Al escanearlo, el ESP32 abre esa caja en MODO CARGA sin tocar
los pedidos de los clientes. Se puede ver de nuevo (Llaves activas → Ver QR) y revocar.

## 2. Imágenes de productos
Panel → Productos → Nuevo / Editar → "Subir imagen". Acepta JPG, PNG, WEBP o GIF (máx. 5 MB),
la reduce a 1000 px y se muestra en el menú, el carrito y el panel. Si cambias o quitas la
imagen, la anterior se borra del disco. Todavía puedes pegar un enlace externo.

## 3. Mejoras del ESP32
- Varias cajas (arreglos de relés y sensores; sube NUM_CAJAS cuando los conectes).
- Llave de admin con MODO CARGA en el LCD.
- Eventos al backend (arranque, puerta abierta/cerrada, nadie abrió, puerta forzada) con cola
  de reintentos si se cae la red. El panel muestra "Actividad reciente" en cada locker.
- Si el cliente escanea y la puerta nunca se abre, el backend le devuelve el código.
- Alarma de puerta forzada (se desactiva con ALARMA_PUERTA_FORZADA = false).
- Reconexión de WiFi sin bloquear, reinicio tras 10 min sin red e indicador W / ! en el LCD.
