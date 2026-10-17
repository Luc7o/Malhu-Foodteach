"""Subida y limpieza de imágenes de productos.

- Con CLOUDINARY_URL definida (producción en Vercel): las fotos se suben a Cloudinary y
  se guarda la URL https completa en el producto.
- Sin CLOUDINARY_URL (tu equipo, o Railway con volumen): se guardan en disco como antes.
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
CLOUD_FOLDER = "malhu/products"


def _cloudinary():
    """Devuelve el módulo cloudinary listo para usar, o None si no está configurado."""
    if not os.getenv("CLOUDINARY_URL", "").strip():
        return None
    import cloudinary  # se importa aquí para no exigirlo en desarrollo local
    import cloudinary.uploader  # noqa: F401
    return cloudinary


def products_dir(upload_root):
    path = os.path.join(upload_root, "products")
    try:
        os.makedirs(path, exist_ok=True)
    except OSError:
        pass  # disco de solo lectura (Vercel): no es grave si usamos Cloudinary
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
    - Cloudinary: https://res.cloudinary.com/.../malhu/products/xxxx.jpg
    - Disco local: /uploads/products/xxxx.jpg
    Lanza ValueError con un mensaje claro si algo está mal.
    """
    img = _procesar(file_storage)
    name = uuid.uuid4().hex

    cloud = _cloudinary()
    if cloud:
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=85, optimize=True)
        buf.seek(0)
        try:
            res = cloud.uploader.upload(
                buf, folder=CLOUD_FOLDER, public_id=name, resource_type="image", overwrite=False
            )
        except Exception as e:  # error de red, claves incorrectas, etc.
            print(f"[imagenes] Error subiendo a Cloudinary: {e}")
            raise ValueError("No se pudo subir la imagen. Revisa la configuración de Cloudinary")
        return res["secure_url"]

    # En Vercel el disco es de solo lectura y se borra solo: sin Cloudinary la foto se perdería
    if os.getenv("VERCEL"):
        raise ValueError(
            "No se pueden guardar fotos en este servidor. Falta configurar CLOUDINARY_URL en las variables de entorno de Vercel"
        )

    try:
        img.save(os.path.join(products_dir(upload_root), f"{name}.jpg"), "JPEG", quality=85, optimize=True)
    except OSError as e:
        print(f"[imagenes] No se pudo guardar en disco: {e}")
        raise ValueError("No se pudo guardar la imagen en el servidor")
    return URL_PREFIX + f"{name}.jpg"


def delete_local_image(url, upload_root):
    """
    Borra la imagen anterior si la subimos nosotros (disco local o Cloudinary).
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

    # Imagen de Cloudinary subida por nosotros: .../upload/v123/malhu/products/xxxx.jpg
    m = re.search(r"res\.cloudinary\.com/.+/upload/(?:v\d+/)?(" + re.escape(CLOUD_FOLDER) + r"/[A-Za-z0-9]+)\.\w+$", url)
    cloud = _cloudinary() if m else None
    if m and cloud:
        try:
            cloud.uploader.destroy(m.group(1), resource_type="image")
        except Exception as e:
            print(f"[imagenes] No se pudo borrar de Cloudinary: {e}")