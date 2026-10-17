"""
Platos personalizables e información nutricional.
    python test_personalizacion.py
"""
import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["ALERT_THREAD"] = "0"

from app import create_app
from extensions import db
from models import Locker, LockerBox, Product, User

app = create_app()
client = app.test_client()


def check(name, cond):
    print(("OK   " if cond else "FALLA"), name)
    if not cond:
        raise SystemExit(1)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


with app.app_context():
    admin = User(name="Admin", email="admin@malhu.com", role="admin")
    admin.set_password("admin1234")
    ana = User(name="Ana", email="ana@mail.com", role="cliente")
    ana.set_password("secreto123")
    locker = Locker(name="Locker", device_id="L-1")
    db.session.add_all([admin, ana, locker])
    db.session.flush()
    for n in range(1, 4):
        db.session.add(LockerBox(locker_id=locker.id, box_number=n, status="libre"))
    db.session.commit()
    LOCKER_ID = locker.id

H = auth(client.post("/api/auth/login", json={"email": "admin@malhu.com", "password": "admin1234", "portal": "admin"}).get_json()["token"])
A = auth(client.post("/api/auth/login", json={"email": "ana@mail.com", "password": "secreto123"}).get_json()["token"])


def make(name, price, stock, **extra):
    r = client.post("/api/admin/products", headers=H, json={"name": name, "price": price, "stock": stock, **extra})
    assert r.status_code == 201, r.get_json()
    return r.get_json()


# ---------------------------------------------------------------- información nutricional
arroz = make("Arroz", 0, 10, calories=200, protein_g=4, carbs_g=44, fat_g=0.5, serving="1 taza", ingredient_only=True)
pollo = make("Pollo", 0, 10, calories=165, protein_g=31, fat_g=3.6, ingredient_only=True)
palta = make("Palta", 0, 2, calories=120, ingredient_only=True)
salsa = make("Salsa secreta", 0, 5, ingredient_only=True)  # sin datos nutricionales
check("nutrición se guarda", arroz["nutrition"]["calories"] == 200 and arroz["nutrition"]["serving"] == "1 taza")
check("sin datos -> nutrition None", salsa["nutrition"] is None)
check("calorías negativas rechazadas", client.post("/api/admin/products", headers=H, json={"name": "X", "price": 1, "stock": 1, "calories": -5}).status_code == 400)
check("calorías no numéricas rechazadas", client.post("/api/admin/products", headers=H, json={"name": "X", "price": 1, "stock": 1, "calories": "mucho"}).status_code == 400)
r = client.put(f"/api/admin/products/{arroz['id']}", headers=H, json={"calories": ""})
check("valor vacío borra el dato", r.get_json()["nutrition"]["calories"] is None)
client.put(f"/api/admin/products/{arroz['id']}", headers=H, json={"calories": 200})

normal = make("Jugo", 5, 10, calories=90)
public = client.get("/api/products").get_json()
names = [p["name"] for p in public]
check("ingredientes no salen en el menú público", names == ["Jugo"])
check("el menú público trae la nutrición", public[0]["nutrition"]["calories"] == 90)

# ---------------------------------------------------------------- crear plato personalizable
bowl_payload = {
    "name": "Bowl armable", "price": 15, "stock": 20, "calories": 50,
    "option_groups": [
        {"name": "Base", "min_select": 1, "max_select": 1, "items": [{"ingredient_id": arroz["id"], "extra_price": 0}]},
        {"name": "Extras", "min_select": 0, "max_select": 2, "items": [
            {"ingredient_id": pollo["id"], "extra_price": 3},
            {"ingredient_id": palta["id"], "extra_price": 2.5},
            {"ingredient_id": salsa["id"], "extra_price": 0},
        ]},
    ],
}
bad = dict(bowl_payload, option_groups=[{"name": "", "min_select": 0, "max_select": 1, "items": [{"ingredient_id": arroz["id"]}]}])
check("grupo sin nombre rechazado", client.post("/api/admin/products", headers=H, json=bad).status_code == 400)
bad = dict(bowl_payload, option_groups=[{"name": "G", "min_select": 3, "max_select": 2, "items": [{"ingredient_id": arroz["id"]}]}])
check("mínimo mayor que máximo rechazado", client.post("/api/admin/products", headers=H, json=bad).status_code == 400)
bad = dict(bowl_payload, option_groups=[{"name": "G", "min_select": 0, "max_select": 1, "items": [{"ingredient_id": "no-existe"}]}])
check("ingrediente inexistente rechazado", client.post("/api/admin/products", headers=H, json=bad).status_code == 400)
bad = dict(bowl_payload, option_groups=[{"name": "G", "min_select": 0, "max_select": 3, "items": [{"ingredient_id": arroz["id"]}]}])
check("máximo mayor que las opciones rechazado", client.post("/api/admin/products", headers=H, json=bad).status_code == 400)
check("tras un error no queda un producto a medias", [p["name"] for p in client.get("/api/admin/products", headers=H).get_json()].count("Bowl armable") == 0)
check("cliente no puede crear platos", client.post("/api/admin/products", headers=A, json=bowl_payload).status_code == 403)

bowl = client.post("/api/admin/products", headers=H, json=bowl_payload).get_json()
check("plato personalizable creado", bowl["customizable"] and len(bowl["option_groups"]) == 2)
base_g, extra_g = bowl["option_groups"]
opt = {i["name"]: i["id"] for g in bowl["option_groups"] for i in g["items"]}
check("opciones traen su nutrición", base_g["items"][0]["nutrition"]["calories"] == 200)
public = {p["name"]: p for p in client.get("/api/products").get_json()}
check("el plato aparece en el menú con sus grupos", public["Bowl armable"]["customizable"] and len(public["Bowl armable"]["option_groups"]) == 2)


def order(items):
    return client.post("/api/orders", headers=A, json={"items": items, "locker_id": LOCKER_ID})


# ---------------------------------------------------------------- validación de pedidos
check("falta elegir la base (obligatoria)", order([{"product_id": bowl["id"], "quantity": 1, "option_ids": []}]).status_code == 400)
r = order([{"product_id": bowl["id"], "quantity": 1, "option_ids": [opt["Arroz"], opt["Pollo"], opt["Palta"], opt["Salsa secreta"]]}])
check("pasarse del máximo de un grupo se rechaza", r.status_code == 400 and "hasta 2" in r.get_json()["error"])
r = order([{"product_id": bowl["id"], "quantity": 1, "option_ids": [opt["Arroz"], "inventada"]}])
check("opción inventada rechazada", r.status_code == 400)
r = order([{"product_id": normal["id"], "quantity": 1, "option_ids": [opt["Pollo"]]}])
check("no se puede personalizar un plato normal", r.status_code == 400)
r = order([{"product_id": arroz["id"], "quantity": 1}])
check("un ingrediente no se pide solo", r.status_code == 400)

# ---------------------------------------------------------------- pedido correcto: precio y calorías del servidor
r = order([{"product_id": bowl["id"], "quantity": 2, "option_ids": [opt["Arroz"], opt["Pollo"], opt["Palta"]], "unit_price": 1}])
o1 = r.get_json()
check("pedido personalizado creado", r.status_code == 201)
check("precio = base + extras (el servidor manda, no el cliente)", o1["items"][0]["unit_price"] == 20.5 and o1["total"] == 41.0)
check("calorías = plato + ingredientes", o1["items"][0]["calories"] == 50 + 200 + 165 + 120)
check("el pedido guarda lo elegido", [x["name"] for x in o1["items"][0]["options"]] == ["Arroz", "Pollo", "Palta"])

# ---------------------------------------------------------------- stock de ingredientes (palta: 2)
r = order([{"product_id": bowl["id"], "quantity": 3, "option_ids": [opt["Arroz"], opt["Palta"]]}])
check("no alcanza el stock de un ingrediente", r.status_code == 400 and "Palta" in r.get_json()["error"])
r = order([
    {"product_id": bowl["id"], "quantity": 1, "option_ids": [opt["Arroz"], opt["Palta"]]},
    {"product_id": bowl["id"], "quantity": 2, "option_ids": [opt["Arroz"], opt["Pollo"]]},
])
o2 = r.get_json()
check("dos configuraciones distintas del mismo plato son dos líneas", r.status_code == 201 and len(o2["items"]) == 2)
check("líneas idénticas se unen",
      len(order([{"product_id": bowl["id"], "quantity": 1, "option_ids": [opt["Arroz"], opt["Pollo"]]},
                 {"product_id": bowl["id"], "quantity": 2, "option_ids": [opt["Pollo"], opt["Arroz"]]}]).get_json()["items"]) == 1)

# ---------------------------------------------------------------- pago: descuenta ingredientes; cancelar los devuelve
r = client.post(f"/api/orders/{o2['id']}/pay", headers=A, json={"method": "tarjeta"})
check("pago OK", r.status_code == 200 and r.get_json()["status"] == "pagado")
with app.app_context():
    st = {p.name: p.stock for p in Product.query.all()}
check("stock del plato y de los ingredientes descontado", st["Bowl armable"] == 17 and st["Arroz"] == 7 and st["Pollo"] == 8 and st["Palta"] == 1)

r = client.post(f"/api/orders/{o1['id']}/pay", headers=A, json={"method": "tarjeta"})
check("segundo pago falla si ya no hay palta suficiente (necesita 2, queda 1)", r.status_code == 409 and "Palta" in r.get_json()["error"])

r = client.post(f"/api/admin/orders/{o2['id']}/cancel", headers=H)
with app.app_context():
    st = {p.name: p.stock for p in Product.query.all()}
check("cancelar un pedido pagado devuelve el stock de ingredientes", r.status_code == 200 and st["Bowl armable"] == 20 and st["Arroz"] == 10 and st["Pollo"] == 10 and st["Palta"] == 2)

# ---------------------------------------------------------------- ingrediente agotado y edición conservando ids
client.put(f"/api/admin/products/{pollo['id']}", headers=H, json={"sold_out": True})
r = order([{"product_id": bowl["id"], "quantity": 1, "option_ids": [opt["Arroz"], opt["Pollo"]]}])
check("ingrediente agotado no se puede elegir", r.status_code == 400 and "Pollo" in r.get_json()["error"])
shown = {i["name"]: i["available"] for g in next(p for p in client.get("/api/products").get_json() if p["id"] == bowl["id"])["option_groups"] for i in g["items"]}
check("la tienda marca el ingrediente como no disponible", shown.get("Pollo") is False and shown.get("Arroz") is True)
client.put(f"/api/admin/products/{pollo['id']}", headers=H, json={"sold_out": False})

edit = client.get("/api/admin/products", headers=H).get_json()
edit = next(p for p in edit if p["id"] == bowl["id"])
groups = edit["option_groups"]
groups[1]["items"] = groups[1]["items"][:2]  # quita la salsa
groups[1]["max_select"] = 2
r = client.put(f"/api/admin/products/{bowl['id']}", headers=H, json={"option_groups": groups})
check("editar grupos conserva los ids de lo que no cambió", r.status_code == 200 and r.get_json()["option_groups"][0]["id"] == base_g["id"]
      and {i["id"] for i in r.get_json()["option_groups"][1]["items"]} == {opt["Pollo"], opt["Palta"]})
r = order([{"product_id": bowl["id"], "quantity": 1, "option_ids": [opt["Arroz"], opt["Salsa secreta"]]}])
check("una opción quitada ya no se puede pedir", r.status_code == 400)

r = client.put(f"/api/admin/products/{bowl['id']}", headers=H, json={"option_groups": []})
check("quitar todos los grupos vuelve el plato normal", r.status_code == 200 and not r.get_json()["customizable"])
r = order([{"product_id": bowl["id"], "quantity": 1}])
check("y se puede pedir sin opciones", r.status_code == 201)

# ---------------------------------------------------------------- pedidos antiguos (sin opciones) siguen igual
r = order([{"product_id": normal["id"], "quantity": 2}])
check("pedido normal sin cambios", r.status_code == 201 and r.get_json()["items"][0]["options"] == [] and r.get_json()["total"] == 10.0)
check("pedido normal: calorías del producto", r.get_json()["items"][0]["calories"] == 90)

# ---------------------------------------------------------------- reportes
csv = client.get("/api/admin/export/orders", headers=H)
check("el CSV de pedidos incluye las opciones elegidas", csv.status_code == 200 and "Bowl armable (Arroz, Pollo, Palta)" in csv.get_data(as_text=True))
check("el CSV de productos exporta", client.get("/api/admin/export/products", headers=H).status_code == 200)

print("\nTodo OK")
