"""
Etiquetas de salud: crear, ordenar, asignar a productos, filtrar en la tienda y exportar.
    python test_etiquetas_salud.py
"""
import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["ALERT_THREAD"] = "0"

from app import create_app
from extensions import db
from models import Product, User

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
    db.session.add_all([admin, ana])
    db.session.commit()

H = auth(client.post("/api/auth/login", json={"email": "admin@malhu.com", "password": "admin1234"}).get_json()["token"])
tok_ana = client.post("/api/auth/login", json={"email": "ana@mail.com", "password": "secreto123"}).get_json()["token"]

# ---------------------------------------------------------------- permisos y validación
check("cliente no entra a las etiquetas del admin", client.get("/api/admin/health-tags", headers=auth(tok_ana)).status_code == 403)
check("cliente no puede crear etiquetas", client.post("/api/admin/health-tags", headers=auth(tok_ana), json={"name": "X"}).status_code == 403)
check("sin sesión tampoco", client.post("/api/admin/health-tags", json={"name": "X"}).status_code == 401)
check("nombre vacío rechazado", client.post("/api/admin/health-tags", headers=H, json={"name": "   "}).status_code == 400)
check("nombre muy largo rechazado", client.post("/api/admin/health-tags", headers=H, json={"name": "x" * 61}).status_code == 400)

# ---------------------------------------------------------------- crear y ordenar
corazon = client.post("/api/admin/health-tags", headers=H, json={"name": "Corazón y colesterol"}).get_json()
check("crear etiqueta", corazon["name"] == "Corazón y colesterol" and corazon["product_count"] == 0)
fibra = client.post("/api/admin/health-tags", headers=H, json={"name": "  Digestión  "}).get_json()
check("el nombre se limpia de espacios", fibra["name"] == "Digestión")
check("nombre repetido (sin importar mayúsculas)", client.post("/api/admin/health-tags", headers=H, json={"name": "digestión"}).status_code == 409)
hierro = client.post("/api/admin/health-tags", headers=H, json={"name": "Hierro y energía"}).get_json()
check("se crean en orden", [t["sort_order"] for t in (corazon, fibra, hierro)] == [0, 1, 2])

r = client.put(f"/api/admin/health-tags/{hierro['id']}", headers=H, json={"name": "Hierro"})
check("renombrar", r.status_code == 200 and r.get_json()["name"] == "Hierro")
check("renombrar a un nombre existente", client.put(f"/api/admin/health-tags/{hierro['id']}", headers=H, json={"name": "Digestión"}).status_code == 409)
check("renombrar con el mismo nombre está permitido", client.put(f"/api/admin/health-tags/{hierro['id']}", headers=H, json={"name": "Hierro"}).status_code == 200)

client.post("/api/admin/health-tags/reorder", headers=H, json={"ids": [hierro["id"], corazon["id"], fibra["id"]]})
names = [t["name"] for t in client.get("/api/admin/health-tags", headers=H).get_json()]
check("reordenar", names == ["Hierro", "Corazón y colesterol", "Digestión"])
check("reordenar con lista vacía rechazado", client.post("/api/admin/health-tags/reorder", headers=H, json={"ids": []}).status_code == 400)

# ---------------------------------------------------------------- productos con etiquetas
def new_product(name, tags=None, **extra):
    body = {"name": name, "price": 10, "stock": 5, **extra}
    if tags is not None:
        body["health_tag_ids"] = tags
    return client.post("/api/admin/products", headers=H, json=body)


r = new_product("Avena con linaza", [corazon["id"], fibra["id"]])
check("producto con 2 etiquetas", r.status_code == 201 and len(r.get_json()["health_tags"]) == 2)
avena = r.get_json()
check("las etiquetas salen en el orden del admin", [t["name"] for t in avena["health_tags"]] == ["Corazón y colesterol", "Digestión"])
quinua = new_product("Quinua con leche", [hierro["id"]]).get_json()
jamon = new_product("Jamón", None, status="publicado").get_json()
check("sin health_tag_ids queda sin etiquetas", jamon["health_tags"] == [])
check("etiqueta inexistente rechazada", new_product("X", ["no-existe"]).status_code == 400)
check("health_tag_ids que no es lista rechazado", new_product("X", "abc").status_code == 400)
check("máximo 6 etiquetas por producto", new_product("X", [corazon["id"]] * 7 + [f"id{i}" for i in range(7)]).status_code == 400)

lista = {t["name"]: t for t in client.get("/api/admin/health-tags", headers=H).get_json()}
check("conteo de productos por etiqueta", lista["Corazón y colesterol"]["product_count"] == 1 and lista["Hierro"]["published_count"] == 1)

# editar
r = client.put(f"/api/admin/products/{avena['id']}", headers=H, json={"health_tag_ids": [hierro["id"]]})
check("editar reemplaza las etiquetas", [t["name"] for t in r.get_json()["health_tags"]] == ["Hierro"])
r = client.put(f"/api/admin/products/{avena['id']}", headers=H, json={"price": 12})
check("editar sin health_tag_ids no las toca", [t["name"] for t in r.get_json()["health_tags"]] == ["Hierro"])
r = client.put(f"/api/admin/products/{avena['id']}", headers=H, json={"health_tag_ids": []})
check("lista vacía quita todas", r.get_json()["health_tags"] == [])
client.put(f"/api/admin/products/{avena['id']}", headers=H, json={"health_tag_ids": [corazon["id"], fibra["id"]]})

# ---------------------------------------------------------------- tienda
pub = client.get("/api/health-tags").get_json()
check("la tienda ve las etiquetas con productos publicados", [t["name"] for t in pub] == ["Hierro", "Corazón y colesterol", "Digestión"])
check("la tienda no expone conteos internos", "product_count" not in pub[0])
productos = client.get("/api/products").get_json()
check("los productos públicos traen sus etiquetas", [t["name"] for t in [p for p in productos if p["name"] == "Avena con linaza"][0]["health_tags"]] == ["Corazón y colesterol", "Digestión"])

client.put(f"/api/admin/products/{quinua['id']}", headers=H, json={"status": "borrador"})
check("si el único producto está en borrador, la etiqueta se oculta", "Hierro" not in [t["name"] for t in client.get("/api/health-tags").get_json()])
check("el admin sí la sigue viendo", "Hierro" in [t["name"] for t in client.get("/api/admin/health-tags", headers=H).get_json()])
client.put(f"/api/admin/products/{quinua['id']}", headers=H, json={"status": "publicado"})

# ---------------------------------------------------------------- CSV
csv = client.get("/api/admin/export/products", headers=H).data.decode("utf-8")
check("el CSV de productos incluye las etiquetas", "Etiquetas de salud" in csv.splitlines()[0] and "Corazón y colesterol; Digestión" in csv)

# ---------------------------------------------------------------- eliminar
r = client.delete(f"/api/admin/health-tags/{fibra['id']}", headers=H)
check("eliminar etiqueta informa a cuántos productos se la quitó", r.status_code == 200 and r.get_json()["removed_from"] == 1)
check("el producto sigue existiendo, sin esa etiqueta", [t["name"] for t in client.get(f"/api/products/{avena['id']}").get_json()["health_tags"]] == ["Corazón y colesterol"])
check("la etiqueta ya no existe", client.put(f"/api/admin/health-tags/{fibra['id']}", headers=H, json={"name": "Otra"}).status_code == 404)
with app.app_context():
    check("no quedan filas huérfanas en la tabla intermedia", db.session.execute(db.text("SELECT COUNT(*) FROM product_health_tags WHERE tag_id = :t"), {"t": fibra["id"]}).scalar() == 0)

print("\nTodas las etiquetas de salud funcionan.")
