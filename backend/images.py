"""Subida y limpieza de imágenes de productos."""
import os
import uuid

from PIL import Image, ImageOps, UnidentifiedImageError

# Protege contra imágenes "bomba" (millones de píxeles)
Image.MAX_IMAGE_PIXELS = 40_000_000

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}
MAX_SIDE = 1000
URL_PREFIX = "/uploads/products/"


def products_dir(upload_root):
    path = os.path.join(upload_root, "products")
    os.makedirs(path, exist_ok=True)
    return path


def save_product_image(file_storage, upload_root):
    """
    Valida que el archivo sea realmente una imagen, la reduce a 1000 px como máximo
    y la guarda como JPEG con un nombre aleatorio. Devuelve la URL relativa
    (por ejemplo /uploads/products/ab12.jpg). Lanza ValueError con un mensaje claro.
    """
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

    name = f"{uuid.uuid4().hex}.jpg"
    img.save(os.path.join(products_dir(upload_root), name), "JPEG", quality=85, optimize=True)
    return URL_PREFIX + name


def delete_local_image(url, upload_root):
    """Borra el archivo si la URL apunta a una imagen subida por nosotros. Ignora el resto."""
    if not url or not url.startswith(URL_PREFIX):
        return
    name = os.path.basename(url)  # basename evita rutas tipo ../../
    path = os.path.join(products_dir(upload_root), name)
    try:
        os.remove(path)
    except OSError:
        pass
