"""
Script de datos de prueba. Ejecutar una sola vez después de crear las tablas:
    python seed.py
"""
import os

from app import create_app
from extensions import db
from models import Category, User, Product, Locker, LockerBox

app = create_app()

# En producción define ADMIN_EMAIL y ADMIN_PASSWORD al correr el seed
# (si no, se usan los datos de prueba de desarrollo).
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@malhu.com").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

<<<<<<< Updated upstream
PRODUCTS = [
    ("Sándwich de pollo", "Con papas al hilo", "Sándwiches", 12.50, 20),
    ("Sándwich mixto", "Jamón, queso y palta", "Sándwiches", 9.00, 18),
    ("Ensalada César", "Porción individual", "Ensaladas", 10.00, 15),
    ("Ensalada de quinua", "Quinua, palta y tomate", "Ensaladas", 11.00, 12),
    ("Jugo de naranja", "500 ml", "Bebidas", 5.00, 30),
    ("Limonada frozen", "500 ml", "Bebidas", 6.00, 25),
    ("Brownie de chocolate", "Con nueces", "Postres", 7.00, 10),
]

=======
# Cuántas cajas tiene el locker de prueba (2 filas x 3 columnas = 6 en el prototipo grande).
# Si tu locker físico es de una sola puerta: LOCKER_BOXES=1 python seed.py
LOCKER_BOXES = int(os.getenv("LOCKER_BOXES", "6"))


# Detalle ampliado por producto (DE EJEMPLO, como el resto): (fibra g, azúcares g, grasa saturada g, sodio mg, ingredientes, alérgenos)
EXTRA = {
    "Bowl de Pollo, Arroz Integral y Brócoli": (6, 3, 3.2, 420, "Pechuga de pollo, arroz integral, brócoli, palta, aceite de oliva, limón, sal.", ""),
    "Bowl de Atún, Quinua y Palta": (7, 4, 2.8, 380, "Atún en agua, quinua, palta, tomate cherry, espinaca, limón, sal.", "Pescado"),
    "Wrap Integral de Pavo y Palta": (6, 4, 2.5, 640, "Tortilla integral, pechuga de pavo, palta, lechuga, tomate.", "Gluten"),
    "Omelette de Claras con Espinaca": (2, 2, 3.1, 360, "Claras de huevo, huevo, espinaca, champiñones, aceite, sal.", "Huevo"),
    "Panqueques de Avena y Claras": (5, 9, 1.5, 180, "Avena, claras de huevo, plátano, canela, polvo de hornear.", "Huevo, gluten (avena)"),
    "Smoothie de Plátano, Avena y Yogur Griego": (4, 22, 2.0, 90, "Plátano, avena, yogur griego natural, leche.", "Leche, gluten (avena)"),
    "Ensalada de Quinua, Palta y Tomate": (8, 6, 2.4, 300, "Quinua, palta, tomate, pepino, choclo, limón, aceite de oliva, sal.", ""),
    "Ensalada César con Pollo": (3, 3, 4.5, 720, "Lechuga, pechuga de pollo, parmesano, crutones integrales, yogur, limón.", "Leche, gluten"),
    "Lentejas con Arroz Integral": (16, 5, 1.0, 380, "Lentejas, arroz integral, zanahoria, cebolla, ajo, comino, sal.", ""),
    "Pescado a la Plancha con Camote": (6, 9, 2.8, 450, "Filete de pescado, camote, lechuga, tomate, limón, aceite, sal.", "Pescado"),
    "Crema de Zapallo y Zanahoria": (4, 9, 0.8, 420, "Zapallo, zanahoria, cebolla, ajo, caldo de verduras, sal.", ""),
    "Pan Integral con Palta y Huevo": (7, 3, 3.5, 410, "Pan integral, palta, huevo, limón, sal.", "Huevo, gluten"),
    "Avena con Manzana y Canela": (6, 11, 1.0, 20, "Avena, agua, manzana, canela.", "Gluten (avena)"),
    "Tostadas con Queso Fresco y Tomate": (4, 4, 5.0, 520, "Pan integral, queso fresco, tomate, orégano.", "Leche, gluten"),
    "Sándwich Mixto": (3, 5, 7.5, 980, "Pan de molde, jamón, queso, palta.", "Gluten, leche"),
    "Arroz con Pollo": (5, 6, 5.5, 1050, "Arroz, pollo, culantro, arvejas, zanahoria, ají amarillo, cebolla, sal.", ""),
    "Lomo Saltado de Res": (6, 8, 9.0, 1380, "Lomo de res, cebolla, tomate, papa, arroz, sillao, vinagre, aceite.", "Soya, gluten (sillao)"),
    "Tallarín Saltado de Verduras": (8, 9, 2.0, 1100, "Tallarín, brócoli, zanahoria, vainita, cebolla china, sillao, aceite.", "Gluten, soya"),
    "Jugo de Naranja": (1, 44, 0.1, 5, "Naranja exprimida.", ""),
    "Jugo Verde": (4, 20, 0.1, 40, "Piña, apio, espinaca, limón.", ""),
    "Yogur Griego Natural sin Azúcar": (0, 5, 1.6, 70, "Leche, cultivos lácticos vivos.", "Leche"),
    "Granola de Quinua y Kiwicha": (3, 8, 1.0, 10, "Avena, quinua pop, kiwicha, pasas, aceite de girasol.", "Gluten (avena)"),
    "Mix de Frutos Secos": (3, 4, 2.0, 5, "Almendras, nueces, pasas.", "Frutos secos"),
    "Barra de Avena y Maní": (3, 10, 1.2, 60, "Avena, maní, dátiles.", "Maní, gluten (avena)"),
    "Maca en Polvo": (0.5, 0.5, 0, 0, "Maca de Junín 100 %.", ""),
    "Hamburguesa Doble con Queso y Tocino": (3, 11, 22, 1650, "Pan brioche, carne de res, queso cheddar, tocino, lechuga, tomate, salsa de la casa.", "Gluten, leche, huevo, soya"),
    "Salchipapa Clásica": (6, 6, 14, 1100, "Papa frita, salchicha, mayonesa, ketchup, ají, aceite vegetal.", "Huevo, soya"),
    "Pollo Broaster con Papas": (5, 4, 11, 1400, "Pollo, harina, especias, papa frita, ensalada, cremas, aceite vegetal.", "Gluten, huevo"),
    "Brownie con Helado de Vainilla": (3, 58, 17, 280, "Chocolate, harina de trigo, azúcar, mantequilla, huevo, helado de vainilla.", "Gluten, leche, huevo"),
}


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
#   La Última Cena   -> 4) antojos: hamburguesas, frituras y postres (altos en grasa, sodio o azúcar)
# ---------------------------------------------------------------------------
CATEGORIES = ["Nutracéuticos", "GymRat", "Platos saludables", "Desayunos", "Almuerzos", "Bebidas", "La Última Cena"]

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

    # ---- La Última Cena (antojos: se muestran con advertencias claras)
    ("Hamburguesa Doble con Queso y Tocino",
     "Dos carnes de res, queso cheddar, tocino crocante y salsa de la casa en pan brioche. Para un antojo de verdad.",
     "La Última Cena", 18.00, 20, nut(950, 48, 62, 55, "1 hamburguesa (380 g)"), [], False),
    ("Salchipapa Clásica",
     "Papas fritas con salchicha, mayonesa, ketchup y ají. Porción para una persona.",
     "La Última Cena", 14.00, 20, nut(820, 24, 78, 48, "1 plato (400 g)"), [], False),
    ("Pollo Broaster con Papas",
     "Presa de pollo frito crocante con papas fritas, ensalada y cremas.",
     "La Última Cena", 17.00, 20, nut(880, 40, 70, 46, "1 plato (450 g)"), [], False),
    ("Brownie con Helado de Vainilla",
     "Brownie tibio de chocolate con una bola de helado y salsa de chocolate.",
     "La Última Cena", 12.00, 20, nut(620, 8, 82, 30, "1 porción (220 g)"), [], False),

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

# Detalle ampliado de cada ingrediente (fibra g, azúcares g, grasa saturada g, sodio mg), para que "Arma tu Bowl" sume todo
INGREDIENT_EXTRA = {
    "Arroz integral": (2.6, 0.4, 0.3, 5), "Quinua": (3.5, 1.5, 0.4, 10), "Camote al horno": (4.5, 9.5, 0.1, 50),
    "Ensalada verde": (1.5, 1.2, 0, 15), "Pechuga de pollo a la plancha": (0, 0, 1.2, 90), "Atún en agua": (0, 0, 0.3, 320),
    "Huevo duro (2)": (0, 1.1, 3.3, 125), "Tofu a la plancha": (1.2, 0.5, 0.9, 12), "Brócoli al vapor": (2.6, 1.7, 0.1, 33),
    "Tomate cherry": (1, 2.2, 0, 4), "Zanahoria rallada": (1.7, 2.8, 0, 40), "Espinaca fresca": (1.1, 0.2, 0, 40),
    "Choclo": (2, 3.5, 0.2, 10), "Palta": (3.4, 0.3, 1, 4), "Frutos secos": (2, 1.2, 1, 2), "Semillas de chía": (3.4, 0, 0.3, 2),
    "Queso fresco": (0, 0.5, 4, 150), "Limón y aceite de oliva": (0, 0.1, 1.1, 1), "Yogur y hierbas": (0, 1.5, 0.6, 20),
    "Mostaza y miel": (0.2, 5, 0, 120),
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


>>>>>>> Stashed changes
with app.app_context():
    # Usuario admin
    if not User.query.filter_by(email=ADMIN_EMAIL).first():
        admin = User(name="Admin Malhu", email=ADMIN_EMAIL, role="admin")
        admin.set_password(ADMIN_PASSWORD)
        db.session.add(admin)

    # Locker de prueba (usa el mismo device_id que vas a poner en el firmware del ESP32)
    # 6 cajas = 2 filas x 3 columnas del prototipo.
    if not Locker.query.filter_by(device_id="LOCKER-001").first():
        locker = Locker(
            name="Locker Prototipo",
            address="Huancayo, Junín",
            device_id="LOCKER-001",
        )
        db.session.add(locker)
        db.session.flush()
        for n in range(1, 7):
            db.session.add(LockerBox(locker_id=locker.id, box_number=n, status="libre"))

<<<<<<< Updated upstream
    # Categorías y productos de prueba
    if Product.query.count() == 0:
        categories = {}
        for position, (_, _, category, _, _) in enumerate(PRODUCTS):
            if category not in categories:
                categories[category] = Category(name=category, sort_order=len(categories))
                db.session.add(categories[category])
        db.session.flush()
        for position, (name, description, category, price, stock) in enumerate(PRODUCTS):
            db.session.add(Product(
                name=name, description=description, category=category,
                category_id=categories[category].id,
                price=price, stock=stock, sort_order=position,
            ))
=======
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

    # ---------------------------------------------------------------- detalle nutricional ampliado
    for name, (fiber, sugar, sat_fat, sodium, ingredients_text, allergens) in EXTRA.items():
        product = by_name(Product, name, ingredient_only=False)
        if product is None or product.sodium_mg is not None:
            continue  # no existe o ya tiene datos cargados
        product.fiber_g, product.sugar_g, product.sat_fat_g, product.sodium_mg = fiber, sugar, sat_fat, sodium
        if not product.ingredients_text:
            product.ingredients_text = ingredients_text
        if product.allergens is None:
            product.allergens = allergens or None

    # ---------------------------------------------------------------- ingredientes y plato armable
    ingredients = {}
    for name, nutrition in INGREDIENTS.items():
        ing = by_name(Product, name, ingredient_only=True)
        if ing is None:
            ing = Product(name=name, price=0, stock=500, ingredient_only=True, sort_order=0)
            set_nutrition(ing, nutrition)
            ing.set_status("publicado")
            db.session.add(ing)
        if ing.sodium_mg is None and name in INGREDIENT_EXTRA:
            ing.fiber_g, ing.sugar_g, ing.sat_fat_g, ing.sodium_mg = INGREDIENT_EXTRA[name]
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
>>>>>>> Stashed changes

    db.session.commit()
    print(f"Datos creados. Login admin: {ADMIN_EMAIL}")
    if ADMIN_PASSWORD == "admin123":
        print("AVISO: estás usando la clave de prueba 'admin123'. Cámbiala antes de salir a producción.")
