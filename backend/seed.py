"""
Datos de prueba de MALHÚ: usuario admin, un locker y un catálogo de productos de ejemplo.

    python seed.py

Se puede correr todas las veces que quieras: busca por nombre y NO duplica nada ni pisa
lo que ya editaste en el panel (categorías, etiquetas y productos que ya existen se respetan).

IMPORTANTE: los datos nutricionales y las etiquetas de salud de este catálogo son DE EJEMPLO
(valores aproximados por porción). Antes de publicar, reemplázalos por los reales de tus
recetas y proveedores, y que un nutricionista valide las etiquetas.
"""
import os

from app import create_app
from extensions import db
from models import (
    Category, HealthTag, Locker, LockerBox, OptionGroup, OptionGroupItem, Product, User,
)

app = create_app()

# En producción define ADMIN_EMAIL y ADMIN_PASSWORD al correr el seed
# (si no, se usan los datos de prueba de desarrollo).
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@malhu.com").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# Cuántas cajas tiene el locker de prueba (2 filas x 3 columnas = 6 en el prototipo grande).
# Si tu locker físico es de una sola puerta: LOCKER_BOXES=1 python seed.py
LOCKER_BOXES = int(os.getenv("LOCKER_BOXES", "6"))


def nut(kcal, protein, carbs, fat, serving):
    """Información nutricional por porción."""
    return {"calories": kcal, "protein_g": protein, "carbs_g": carbs, "fat_g": fat, "serving": serving}


# ---------------------------------------------------------------------------
# Etiquetas de salud (orden en que se muestran en la tienda)
# ---------------------------------------------------------------------------
HEALTH_TAGS = [
    "Control de peso",
    "Post entreno",
    "Alto en proteína",
    "Para cuidar tu corazón",
    "Fuente de fibra",
    "Sin azúcar añadida",
    "Vegano",
    "Vegetariano",
    "Probiótico",
    "Energía",
]

# ---------------------------------------------------------------------------
# Categorías (orden en que se muestran). Se crean solo si algún producto nuevo las usa.
#   Nutracéuticos     -> 1) envasados que ayudan a la salud
#   GymRat            -> 2) preparados altos en proteína (gimnasio y rendimiento)
#   Platos saludables -> 2) preparados sanos
#   Desayunos y Almuerzos, Bebidas -> 3) productos comunes de desayuno y almuerzo
# ---------------------------------------------------------------------------
CATEGORIES = ["Nutracéuticos", "GymRat", "Platos saludables", "Desayunos", "Almuerzos", "Bebidas"]

# ---------------------------------------------------------------------------
# Productos del menú: (nombre, descripción, categoría, precio, stock, nutrición, etiquetas, destacado)
# ---------------------------------------------------------------------------
PRODUCTS = [
    # ---- GymRat
    ("Bowl de Pollo, Arroz Integral y Brócoli",
     "Pechuga de pollo a la plancha con arroz integral, brócoli al vapor, palta y aceite de oliva. Alto en proteína, ideal para después de entrenar o como almuerzo.",
     "GymRat", 16.00, 25, nut(530, 52, 44, 16, "1 bowl (450 g)"), ["Control de peso", "Post entreno", "Alto en proteína"], True),
    ("Bowl de Atún, Quinua y Palta",
     "Atún en agua, quinua, palta, tomate cherry y espinaca con limón. Una comida completa y ligera.",
     "GymRat", 15.00, 20, nut(480, 38, 40, 17, "1 bowl (400 g)"), ["Alto en proteína", "Control de peso"], False),
    ("Wrap Integral de Pavo y Palta",
     "Tortilla integral con pechuga de pavo, palta, lechuga y tomate.",
     "GymRat", 12.00, 20, nut(410, 32, 38, 14, "1 wrap (260 g)"), ["Alto en proteína", "Control de peso"], False),
    ("Omelette de Claras con Espinaca",
     "Claras y un huevo entero con espinaca y champiñones salteados. Sin pan, para cuidar los carbohidratos.",
     "GymRat", 9.50, 25, nut(220, 24, 6, 11, "1 omelette (220 g)"), ["Alto en proteína", "Control de peso"], False),
    ("Panqueques de Avena y Claras",
     "Tres panqueques de avena y claras con plátano. Sin azúcar añadida.",
     "GymRat", 10.00, 20, nut(320, 26, 38, 7, "3 panqueques (230 g)"), ["Post entreno", "Sin azúcar añadida"], False),
    ("Smoothie de Plátano, Avena y Yogur Griego",
     "Plátano, avena y yogur griego natural licuados con leche. Sin azúcar añadida.",
     "GymRat", 9.00, 30, nut(280, 16, 42, 5, "1 vaso (400 ml)"), ["Post entreno", "Energía", "Sin azúcar añadida"], False),

    # ---- Platos saludables
    ("Ensalada de Quinua, Palta y Tomate",
     "Quinua, palta, tomate, pepino y choclo con limón y aceite de oliva.",
     "Platos saludables", 11.00, 20, nut(360, 12, 42, 16, "1 porción (350 g)"), ["Vegano", "Fuente de fibra"], False),
    ("Ensalada César con Pollo",
     "Lechuga, pechuga de pollo a la plancha, parmesano y crutones integrales con aderezo de yogur.",
     "Platos saludables", 12.00, 20, nut(320, 30, 14, 15, "1 porción (320 g)"), ["Alto en proteína", "Control de peso"], False),
    ("Lentejas con Arroz Integral",
     "Lentejas guisadas con zanahoria y cebolla, acompañadas de arroz integral.",
     "Platos saludables", 11.00, 20, nut(420, 18, 70, 6, "1 plato (400 g)"), ["Vegano", "Fuente de fibra", "Para cuidar tu corazón"], False),
    ("Pescado a la Plancha con Camote",
     "Filete de pescado a la plancha con puré de camote y ensalada fresca.",
     "Platos saludables", 16.00, 15, nut(450, 36, 40, 14, "1 plato (420 g)"), ["Alto en proteína", "Para cuidar tu corazón"], False),
    ("Crema de Zapallo y Zanahoria",
     "Crema suave de zapallo y zanahoria, sin crema de leche.",
     "Platos saludables", 7.00, 25, nut(150, 3, 24, 5, "1 taza (300 ml)"), ["Vegano", "Fuente de fibra"], False),

    # ---- Desayunos
    ("Pan Integral con Palta y Huevo",
     "Dos tostadas de pan integral con palta y huevo pochado.",
     "Desayunos", 10.00, 25, nut(340, 15, 30, 18, "2 tostadas (230 g)"), ["Fuente de fibra", "Vegetariano"], False),
    ("Avena con Manzana y Canela",
     "Avena cocida con manzana y canela. Sin azúcar añadida.",
     "Desayunos", 6.00, 30, nut(250, 8, 44, 5, "1 taza (300 ml)"), ["Fuente de fibra", "Energía", "Sin azúcar añadida", "Vegetariano"], False),
    ("Tostadas con Queso Fresco y Tomate",
     "Pan integral tostado con queso fresco, tomate y orégano.",
     "Desayunos", 8.00, 25, nut(260, 14, 28, 10, "2 tostadas (200 g)"), ["Vegetariano"], False),
    ("Sándwich Mixto",
     "Jamón, queso y palta en pan de molde.",
     "Desayunos", 9.00, 18, nut(380, 18, 34, 19, "1 sándwich (220 g)"), [], False),

    # ---- Almuerzos
    ("Arroz con Pollo",
     "Clásico arroz con pollo con ensalada criolla.",
     "Almuerzos", 12.00, 20, nut(650, 35, 80, 20, "1 plato (450 g)"), [], False),
    ("Lomo Saltado de Res",
     "Lomo de res saltado con cebolla y tomate, papas y arroz.",
     "Almuerzos", 15.00, 20, nut(720, 38, 78, 28, "1 plato (480 g)"), [], False),
    ("Tallarín Saltado de Verduras",
     "Tallarines salteados con brócoli, zanahoria, vainita y cebolla china.",
     "Almuerzos", 11.00, 20, nut(520, 15, 82, 14, "1 plato (420 g)"), ["Vegetariano"], False),

    # ---- Bebidas
    ("Jugo de Naranja",
     "Jugo natural de naranja, sin azúcar añadida. 500 ml.",
     "Bebidas", 5.00, 30, nut(225, 3.5, 52, 1, "1 vaso (500 ml)"), ["Sin azúcar añadida"], False),
    ("Jugo Verde",
     "Piña, apio, espinaca y limón. Sin azúcar añadida. 400 ml.",
     "Bebidas", 6.00, 25, nut(120, 2, 28, 0.5, "1 vaso (400 ml)"), ["Sin azúcar añadida", "Vegano"], False),

    # ---- Nutracéuticos (envasados)
    ("Yogur Griego Natural sin Azúcar",
     "Yogur griego natural sin azúcar, con cultivos vivos. Pote de 200 g.",
     "Nutracéuticos", 6.50, 40, nut(120, 20, 6, 2.5, "1 pote (200 g)"), ["Alto en proteína", "Probiótico", "Sin azúcar añadida"], False),
    ("Granola de Quinua y Kiwicha",
     "Granola artesanal con avena, quinua pop, kiwicha y pasas. Bolsa de 250 g.",
     "Nutracéuticos", 14.00, 30, nut(170, 4, 26, 6, "3 cucharadas (40 g)"), ["Fuente de fibra", "Energía"], False),
    ("Mix de Frutos Secos",
     "Almendras, nueces y pasas sin sal ni azúcar añadida. Bolsa de 50 g.",
     "Nutracéuticos", 7.00, 40, nut(300, 8, 8, 26, "1 bolsa (50 g)"), ["Energía", "Sin azúcar añadida"], False),
    ("Barra de Avena y Maní",
     "Barra de avena, maní y dátiles, sin azúcar añadida. 45 g.",
     "Nutracéuticos", 4.50, 50, nut(190, 7, 24, 8, "1 barra (45 g)"), ["Energía", "Sin azúcar añadida"], False),
    ("Maca en Polvo",
     "Maca de Junín en polvo. Frasco de 200 g.",
     "Nutracéuticos", 18.00, 20, nut(18, 0.8, 3.6, 0.1, "1 cucharadita (5 g)"), ["Energía"], False),
]

# ---------------------------------------------------------------------------
# Plato armable: "Arma tu bowl". Cada opción es un ingrediente (producto que no sale en el menú).
# ---------------------------------------------------------------------------
INGREDIENTS = {
    # nombre: nutrición por porción
    "Arroz integral": nut(167, 3.5, 35, 1.3, "150 g"),
    "Quinua": nut(180, 6.6, 32, 2.9, "150 g"),
    "Camote al horno": nut(135, 2.3, 31, 0.2, "150 g"),
    "Ensalada verde": nut(20, 1.5, 3.5, 0.3, "100 g"),
    "Pechuga de pollo a la plancha": nut(198, 37, 0, 4.3, "120 g"),
    "Atún en agua": nut(116, 26, 0, 1, "100 g"),
    "Huevo duro (2)": nut(155, 13, 1.1, 11, "100 g"),
    "Tofu a la plancha": nut(91, 9.6, 2.3, 5.8, "120 g"),
    "Brócoli al vapor": nut(35, 2.4, 7.2, 0.4, "100 g"),
    "Tomate cherry": nut(14, 0.7, 3.1, 0.2, "80 g"),
    "Zanahoria rallada": nut(25, 0.6, 5.8, 0.1, "60 g"),
    "Espinaca fresca": nut(12, 1.4, 1.8, 0.2, "50 g"),
    "Choclo": nut(70, 2.6, 15, 1, "80 g"),
    "Palta": nut(80, 1, 4.3, 7.3, "50 g"),
    "Frutos secos": nut(120, 4, 4, 10.5, "20 g"),
    "Semillas de chía": nut(49, 1.7, 4.2, 3.1, "10 g"),
    "Queso fresco": nut(81, 5.5, 0.6, 6.3, "30 g"),
    "Limón y aceite de oliva": nut(70, 0, 0.1, 7.5, "15 ml"),
    "Yogur y hierbas": nut(25, 1.5, 2, 1, "30 g"),
    "Mostaza y miel": nut(30, 0.3, 6, 0.5, "15 g"),
}

CUSTOM_DISH = {
    "name": "Arma tu Bowl",
    "description": "Elige tu base, tu proteína, tus vegetales y tus toppings. Ves las calorías y el precio mientras armas.",
    "category": "Platos saludables",
    "price": 12.00,
    "stock": 50,
    "tags": [],
    # (paso, mínimo, máximo, [(ingrediente, precio extra)])
    "groups": [
        ("Elige tu base", 1, 1, [("Arroz integral", 0), ("Quinua", 1.50), ("Camote al horno", 0), ("Ensalada verde", 0)]),
        ("Elige tu proteína", 1, 1, [("Pechuga de pollo a la plancha", 3.00), ("Atún en agua", 3.00),
                                      ("Huevo duro (2)", 2.00), ("Tofu a la plancha", 2.50)]),
        ("Vegetales", 1, 3, [("Brócoli al vapor", 0), ("Tomate cherry", 0), ("Zanahoria rallada", 0),
                             ("Espinaca fresca", 0), ("Choclo", 0)]),
        ("Toppings", 0, 2, [("Palta", 2.00), ("Frutos secos", 2.00), ("Semillas de chía", 1.00), ("Queso fresco", 1.50)]),
        ("Aderezo", 0, 1, [("Limón y aceite de oliva", 0), ("Yogur y hierbas", 0), ("Mostaza y miel", 0)]),
    ],
}


def by_name(model, name, **filters):
    """Busca por nombre sin distinguir mayúsculas."""
    return model.query.filter(db.func.lower(model.name) == name.lower()).filter_by(**filters).first()


def set_nutrition(product, n):
    product.calories = n["calories"]
    product.protein_g = n["protein_g"]
    product.carbs_g = n["carbs_g"]
    product.fat_g = n["fat_g"]
    product.serving = n["serving"]


with app.app_context():
    # ---------------------------------------------------------------- admin
    if not User.query.filter_by(email=ADMIN_EMAIL).first():
        admin = User(name="Admin Malhu", email=ADMIN_EMAIL, role="admin")
        admin.set_password(ADMIN_PASSWORD)
        db.session.add(admin)

    # ---------------------------------------------------------------- locker de prueba
    # Usa el mismo device_id que vas a poner en el firmware del ESP32.
    if not Locker.query.filter_by(device_id="LOCKER-001").first():
        locker = Locker(name="Locker Prototipo", address="Huancayo, Junín", device_id="LOCKER-001")
        db.session.add(locker)
        db.session.flush()
        for n in range(1, LOCKER_BOXES + 1):
            db.session.add(LockerBox(locker_id=locker.id, box_number=n, status="libre"))

    # ---------------------------------------------------------------- etiquetas y categorías
    # Se crean al usarlas por primera vez; las que ya existen (aunque las hayas renombrado en
    # mayúsculas/minúsculas) se reutilizan.
    tags = {}

    def get_tag(name):
        key = name.lower()
        if key not in tags:
            tag = by_name(HealthTag, name)
            if tag is None:
                tag = HealthTag(name=name, sort_order=HEALTH_TAGS.index(name) if name in HEALTH_TAGS else len(HEALTH_TAGS))
                db.session.add(tag)
                db.session.flush()
            tags[key] = tag
        return tags[key]

    categories = {}

    def get_category(name):
        key = name.lower()
        if key not in categories:
            cat = by_name(Category, name)
            if cat is None:
                cat = Category(name=name, sort_order=CATEGORIES.index(name) if name in CATEGORIES else len(CATEGORIES))
                db.session.add(cat)
                db.session.flush()
            categories[key] = cat
        return categories[key]

    created, skipped = 0, 0

    # ---------------------------------------------------------------- productos del menú
    for position, (name, description, category, price, stock, nutrition, tag_names, featured) in enumerate(PRODUCTS):
        if by_name(Product, name, ingredient_only=False):
            skipped += 1
            continue
        cat = get_category(category)
        product = Product(
            name=name, description=description, category=cat.name, category_id=cat.id,
            price=price, stock=stock, featured=featured, sort_order=position,
        )
        set_nutrition(product, nutrition)
        product.set_status("publicado")
        product.health_tags = [get_tag(t) for t in tag_names]
        db.session.add(product)
        created += 1

    # ---------------------------------------------------------------- ingredientes y plato armable
    ingredients = {}
    for name, nutrition in INGREDIENTS.items():
        ing = by_name(Product, name, ingredient_only=True)
        if ing is None:
            ing = Product(name=name, price=0, stock=500, ingredient_only=True, sort_order=0)
            set_nutrition(ing, nutrition)
            ing.set_status("publicado")
            db.session.add(ing)
        ingredients[name] = ing
    db.session.flush()

    if by_name(Product, CUSTOM_DISH["name"], ingredient_only=False):
        skipped += 1
    else:
        cat = get_category(CUSTOM_DISH["category"])
        dish = Product(
            name=CUSTOM_DISH["name"], description=CUSTOM_DISH["description"],
            category=cat.name, category_id=cat.id,
            price=CUSTOM_DISH["price"], stock=CUSTOM_DISH["stock"], sort_order=len(PRODUCTS),
        )
        dish.set_status("publicado")
        dish.health_tags = [get_tag(t) for t in CUSTOM_DISH["tags"]]
        for g_pos, (g_name, g_min, g_max, items) in enumerate(CUSTOM_DISH["groups"]):
            group = OptionGroup(name=g_name, min_select=g_min, max_select=g_max, sort_order=g_pos)
            for i_pos, (ing_name, extra) in enumerate(items):
                group.items.append(OptionGroupItem(ingredient_id=ingredients[ing_name].id, extra_price=extra, sort_order=i_pos))
            dish.option_groups.append(group)
        db.session.add(dish)
        created += 1

    db.session.commit()
    print(f"Datos listos. Login admin: {ADMIN_EMAIL}")
    print(f"Productos creados: {created} | ya existían (no se tocaron): {skipped}")
    if ADMIN_PASSWORD == "admin123":
        print("AVISO: estás usando la clave de prueba 'admin123'. Cámbiala antes de salir a producción.")
