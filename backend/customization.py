"""
Platos personalizables: valida lo que eligió el cliente, calcula precio y valores nutricionales,
y calcula cuánto stock consume un pedido (el plato base + cada ingrediente elegido).
"""
import json
from collections import defaultdict

from models import OptionGroupItem

MAX_OPTIONS_PER_DISH = 30


class SelectionError(Exception):
    pass


def _num(value):
    return float(value) if value is not None else None


def nutrition_totals(base, ingredients):
    """
    Suma calorías y macros del plato base y de los ingredientes elegidos.
    Un dato que falta cuenta como 0, pero `complete` queda en False para avisar que es aproximado.
    El plato base de un plato armable puede no tener datos (va "vacío"): eso no lo hace incompleto.
    """
    totals = {"calories": 0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0,
              "fiber_g": 0.0, "sugar_g": 0.0, "sat_fat_g": 0.0, "sodium_mg": 0.0}
    complete = True
    known_any = False

    def add(product, required):
        nonlocal complete, known_any
        values = {
            "calories": product.calories,
            "protein_g": _num(product.protein_g),
            "carbs_g": _num(product.carbs_g),
            "fat_g": _num(product.fat_g),
            "fiber_g": _num(product.fiber_g),
            "sugar_g": _num(product.sugar_g),
            "sat_fat_g": _num(product.sat_fat_g),
            "sodium_mg": _num(product.sodium_mg),
        }
        if values["calories"] is None:
            if required:
                complete = False
        else:
            known_any = True
        for key, v in values.items():
            if v is not None:
                totals[key] += v

    add(base, required=not base.is_customizable())
    for ing in ingredients:
        add(ing, required=True)

    if not known_any:
        return None
    return {
        "calories": int(round(totals["calories"])),
        "protein_g": round(totals["protein_g"], 1),
        "carbs_g": round(totals["carbs_g"], 1),
        "fat_g": round(totals["fat_g"], 1),
        "fiber_g": round(totals["fiber_g"], 1),
        "sugar_g": round(totals["sugar_g"], 1),
        "sat_fat_g": round(totals["sat_fat_g"], 1),
        "sodium_mg": int(round(totals["sodium_mg"])),
        "complete": complete,
    }


def resolve_selection(product, option_ids):
    """
    Valida las opciones elegidas para `product` y devuelve (opciones, extra_total, snapshot).
    - opciones: lista de OptionGroupItem
    - snapshot: lista de dicts que se guarda en el pedido
    Lanza SelectionError con un mensaje para el cliente.
    """
    if option_ids is None:
        option_ids = []
    if not isinstance(option_ids, list) or any(not isinstance(i, str) for i in option_ids):
        raise SelectionError("Las opciones del plato no son válidas")
    option_ids = list(dict.fromkeys(option_ids))  # sin repetidos

    groups = [g for g in product.option_groups if g.items]
    if not groups:
        if option_ids:
            raise SelectionError(f"«{product.name}» no se puede personalizar")
        return [], 0.0, []
    if len(option_ids) > MAX_OPTIONS_PER_DISH:
        raise SelectionError("Elegiste demasiadas opciones")

    found = {
        o.id: o
        for o in OptionGroupItem.query.filter(OptionGroupItem.id.in_(option_ids)).all()
    } if option_ids else {}
    valid_group_ids = {g.id for g in groups}
    chosen = []
    for oid in option_ids:
        opt = found.get(oid)
        if not opt or opt.group_id not in valid_group_ids:
            raise SelectionError(f"Una de las opciones de «{product.name}» ya no existe. Vuelve a armar tu plato.")
        if not opt.is_available():
            name = opt.ingredient.name if opt.ingredient else "una opción"
            raise SelectionError(f"«{name}» ya no está disponible. Elige otra opción.")
        chosen.append(opt)

    per_group = defaultdict(list)
    for opt in chosen:
        per_group[opt.group_id].append(opt)
    for g in groups:
        n = len(per_group.get(g.id, []))
        if n < g.min_select:
            falta = g.min_select - n
            raise SelectionError(f"En «{g.name}» elige al menos {g.min_select} (te falta{'n' if falta > 1 else ''} {falta}).")
        if n > g.max_select:
            raise SelectionError(f"En «{g.name}» puedes elegir hasta {g.max_select}.")

    # Orden estable: como aparecen los grupos y sus opciones en el plato
    order = {o.id: (gi, oi) for gi, g in enumerate(groups) for oi, o in enumerate(g.items)}
    chosen.sort(key=lambda o: order[o.id])

    extra = round(sum(float(o.extra_price or 0) for o in chosen), 2)
    snapshot = [
        {
            "item_id": o.id,
            "product_id": o.ingredient_id,
            "name": o.ingredient.name,
            "group": o.group.name,
            "extra_price": float(o.extra_price or 0),
            "calories": o.ingredient.calories,
        }
        for o in chosen
    ]
    return chosen, extra, snapshot


def dumps_selection(snapshot):
    return json.dumps(snapshot, ensure_ascii=False) if snapshot else None


def order_demand(order):
    """Unidades que consume un pedido de cada producto: el plato y cada ingrediente elegido."""
    demand = defaultdict(int)
    for item in order.items:
        demand[item.product_id] += item.quantity
        for opt in item.selection_list():
            pid = opt.get("product_id")
            if pid:
                demand[pid] += item.quantity
    return demand
