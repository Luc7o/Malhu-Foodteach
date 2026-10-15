# Cómo publicar Malhu Foodteach

Arquitectura recomendada:

| Parte | Dónde | Por qué |
|---|---|---|
| Frontend (React + Vite) | **Vercel** | Estático, gratis y muy rápido |
| Backend (Flask) + Postgres + imágenes | **Railway** | Servidor siempre encendido: soporta el hilo de alertas, las consultas del ESP32 cada 2 s y el disco para las fotos |

> El backend NO se recomienda en Vercel Hobby: el ESP32 consulta `/api/locker/commands`
> cada 2 s (~1,3 millones de llamadas al mes por locker) y Hobby incluye muchas menos
> invocaciones; además Vercel no guarda archivos en disco ni permite el hilo de alertas.

## 0. Antes de hacer push

```bash
# Si estos archivos ya estaban en GitHub, sácalos del repositorio (no borra tus copias locales):
git rm -r --cached backend/.env frontend/node_modules backend/__pycache__ backend/routes/__pycache__ backend/uploads 2>/dev/null

# Restos de la app Flutter de MoviCash que no se usan en esta web:
git rm -r --cached frontend/android frontend/ios frontend/linux frontend/macos frontend/windows \
  frontend/lib frontend/web frontend/test frontend/assets frontend/pubspec.yaml frontend/pubspec.lock \
  frontend/analysis_options.yaml frontend/.metadata frontend/devtools_options.yaml frontend/README.md 2>/dev/null

git add . && git commit -m "Preparar despliegue: Postgres, Railway y Vercel" && git push
```

Si `backend/.env` llegó a estar en GitHub, cambia cualquier clave real que tuviera
(contraseñas, `JWT_SECRET_KEY`) y considera el repositorio privado.

## 1. Railway (backend + base de datos)

1. **New Project → Deploy from GitHub repo** → elige `Malhu-Foodteach`.
2. En el servicio: **Settings → Source → Root Directory** = `backend`.
3. **Settings → Deploy → Custom Start Command** (si no toma el `Procfile`):
   `gunicorn wsgi:app --workers 1 --threads 4 --timeout 60 --bind 0.0.0.0:$PORT`
   Importante: **1 solo worker** (el hilo de alertas y el volumen no se comparten entre réplicas).
4. **+ New → Database → Add PostgreSQL**.
5. En el servicio del backend → **Variables**:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (referencia al Postgres)
   - `JWT_SECRET_KEY` = una clave larga: `python -c "import secrets; print(secrets.token_hex(32))"`
   - `CORS_ORIGINS` = la URL de Vercel (paso 2). Si aún no la tienes, déjalo para después.
   - `UPLOAD_FOLDER` = `/data/uploads`
   - Opcionales: las de `.env.izipay.example` (pagos y correos).
6. **Volume**: en el servicio, **+ Add Volume** → Mount path `/data` (aquí se guardan las fotos de productos).
7. **Settings → Networking → Generate Domain** → tendrás `https://xxxx.up.railway.app`.
   Comprueba `https://xxxx.up.railway.app/api/health`.
8. Crear el admin y los datos iniciales, una sola vez, desde tu PC (copia `DATABASE_PUBLIC_URL`
   de las variables del Postgres en Railway):

   ```bash
   cd backend
   pip install -r requirements.txt
   DATABASE_URL="<DATABASE_PUBLIC_URL>" ADMIN_EMAIL="tu@correo.com" ADMIN_PASSWORD="una-clave-fuerte" python seed.py
   ```
   (En Windows PowerShell: `$env:DATABASE_URL="..."; $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; python seed.py`)

## 2. Vercel (frontend)

1. **Add New → Project** → importa el repo → **Import single project** en `frontend`.
2. **Root Directory** = `frontend`, preset **Vite**.
3. **Environment Variables**: `VITE_API_URL` = `https://xxxx.up.railway.app/api`
   (**debe terminar en `/api`**, sin "/" extra al final).
4. Deploy. Tendrás `https://tu-proyecto.vercel.app`.

## 3. Cerrar el círculo

- En Railway pon `CORS_ORIGINS` = `https://tu-proyecto.vercel.app` (exacta, sin "/" final). Se redespliega solo.
- **Izipay**: la IPN es `https://xxxx.up.railway.app/api/izipay/ipn` (ver `GUIA_PAGOS_IZIPAY.md`).
- **ESP32**: `BACKEND_URL` = `https://xxxx.up.railway.app`. Como es `https`, en el firmware usa
  `WiFiClientSecure client; client.setInsecure(); http.begin(client, url);`
  (o instala el certificado raíz para mayor seguridad).

## Notas

- Las fotos viven en el Volume de Railway: no se pierden al redesplegar, pero haz copia si son importantes.
- Probado: las 4 pruebas del backend en SQLite y el flujo completo contra Postgres real; el frontend compila.
- Para correr en tu PC sigue valiendo el `README.md` (MySQL o SQLite); copia `backend/.env.example` a `backend/.env`.
