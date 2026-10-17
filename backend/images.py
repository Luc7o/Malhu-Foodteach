"""Subida y limpieza de imágenes de productos.

- En Vercel (Blob conectado al proyecto): las fotos se suben a Vercel Blob (store PÚBLICO) y
  se guarda la URL https completa en el producto.
- Sin Blob (tu equipo, o Railway con volumen): se guardan en disco como antes.
"""
import io
import os
import re
import uuid

from PIL import Image, ImageOps, UnidentifiedImageError

# Protege contra imágenes "bomba" (millones de píxeles)
Image.MAX_IMAGE_PIXELS = 40_000_000

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}
MAX_SIDE = 1000
URL_PREFIX = "/uploads/products/"
BLOB_FOLDER = "malhu/products"


def _blob_configurado():
    """True si el proyecto tiene un Vercel Blob conectado (token o store + OIDC)."""
    return bool(os.getenv("BLOB_READ_WRITE_TOKEN", "").strip() or os.getenv("BLOB_STORE_ID", "").strip())


def _blob():
    """Devuelve el módulo de Vercel Blob (API síncrona), o None si no está configurado."""
    if not _blob_configurado():
        return None
    from vercel.blob import sync as blob  # se importa aquí para no exigirlo en desarrollo local
    return blob


def products_dir(upload_root):
    path = os.path.join(upload_root, "products")
    try:
        os.makedirs(path, exist_ok=True)
    except OSError:
        pass  # disco de solo lectura (Vercel): no es grave si usamos Vercel Blob
    return path


def _procesar(file_storage):
    """Valida que sea una imagen real y la devuelve reducida (máx. 1000 px) como RGB."""
    if file_storage is None or not file_storage.filename:
        raise ValueError("No se recibió ninguna imagen")

    try:
        img = Image.open(file_storage.stream)
        fmt = img.format
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise ValueError("El archivo no es una imagen válida")

    if fmt not in ALLOWED_FORMATS:
        raise ValueError("Formato no permitido. Usa JPG, PNG, WEBP o GIF")

    img = ImageOps.exif_transpose(img)  # respeta la orientación de fotos de celular
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        fondo = Image.new("RGB", img.size, (255, 255, 255))
        fondo.paste(img, mask=img.split()[-1])
        img = fondo
    else:
        img = img.convert("RGB")

    img.thumbnail((MAX_SIDE, MAX_SIDE))
    return img


def save_product_image(file_storage, upload_root):
    """
    Valida la imagen, la reduce a 1000 px como máximo y la guarda como JPEG con nombre
    aleatorio. Devuelve la URL a guardar en el producto:
    - Vercel Blob: https://<store>.public.blob.vercel-storage.com/malhu/products/xxxx.jpg
    - Disco local: /uploads/products/xxxx.jpg
    Lanza ValueError con un mensaje claro si algo está mal.
    """
    img = _procesar(file_storage)
    name = uuid.uuid4().hex

    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85, optimize=True)
    data = buf.getvalue()

    blob = _blob()
    if blob:
        try:
            res = blob.put_blob(
                f"{BLOB_FOLDER}/{name}.jpg",
                data,
                access="public",
                content_type="image/jpeg",
                add_random_suffix=False,
            )
        except Exception as e:  # credenciales, store privado, red, etc.
            print(f"[imagenes] Error subiendo a Vercel Blob: {type(e).__name__}: {e}")
            raise ValueError(
                "No se pudo subir la imagen. Revisa que el Blob de Vercel esté conectado al proyecto y sea público"
            )
        return res.url

    # En Vercel el disco es de solo lectura y se borra solo: sin Blob la foto se perdería
    if os.getenv("VERCEL"):
        raise ValueError(
            "No se pueden guardar fotos en este servidor. Conecta un Blob público al proyecto en Vercel (Storage)"
        )

    try:
        with open(os.path.join(products_dir(upload_root), f"{name}.jpg"), "wb") as f:
            f.write(data)
    except OSError as e:
        print(f"[imagenes] No se pudo guardar en disco: {e}")
        raise ValueError("No se pudo guardar la imagen en el servidor")
    return URL_PREFIX + f"{name}.jpg"


def delete_local_image(url, upload_root):
    """
    Borra la imagen anterior si la subimos nosotros (disco local o Vercel Blob).
    Ignora cualquier otra URL. (Se mantiene el nombre para no tocar routes/products.py.)
    """
    if not url:
        return

    if url.startswith(URL_PREFIX):
        name = os.path.basename(url)  # basename evita rutas tipo ../../
        try:
            os.remove(os.path.join(products_dir(upload_root), name))
        except OSError:
            pass
        return

    # Imagen de Vercel Blob subida por nosotros: https://<store>.public.blob.vercel-storage.com/malhu/products/xxxx.jpg
    m = re.fullmatch(
        r"https://[A-Za-z0-9_-]+\.public\.blob\.vercel-storage\.com/" + re.escape(BLOB_FOLDER) + r"/[A-Za-z0-9]+\.jpg",
        url,
    )
    blob = _blob() if m else None
    if m and blob:
        try:
            blob.delete_blob(url)
        except Exception as e:
            print(f"[imagenes] No se pudo borrar de Vercel Blob: {type(e).__name__}: {e}")
