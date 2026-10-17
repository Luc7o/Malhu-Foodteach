"""
Copia TODOS los datos de tu base actual (MySQL o Postgres) a otra base (Neon).

Uso:
    python copiar_bd.py "URL_ORIGEN" "URL_DESTINO"

Ejemplos de URL:
    MySQL local : mysql+pymysql://root:tu_clave@localhost/malhu_foodtech
    Postgres    : postgresql://usuario:clave@host/neondb?sslmode=require

- Crea las tablas en el destino si no existen.
- Si una tabla del destino ya tiene datos, la omite (no duplica nada).
- No modifica ni borra la base de origen.
"""
import sys

from sqlalchemy import MetaData, Table, create_engine, func, inspect, select, text

import models  # noqa: F401  (carga todas las tablas en db.metadata)
from extensions import db

BATCH = 500


def normalizar(url):
    url = url.strip()
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    origen = create_engine(normalizar(sys.argv[1]))
    destino = create_engine(normalizar(sys.argv[2]), pool_pre_ping=True)
    if origen.url == destino.url:
        sys.exit("El origen y el destino son la misma base. Revisa las URLs.")

    db.metadata.create_all(destino)
    tablas_origen = set(inspect(origen).get_table_names())
    total = 0

    # sorted_tables respeta el orden de las llaves foráneas (padres primero)
    for tabla in db.metadata.sorted_tables:
        if tabla.name not in tablas_origen:
            print(f"- {tabla.name}: no existe en el origen, se omite")
            continue

        with destino.connect() as c:
            if c.execute(select(func.count()).select_from(tabla)).scalar():
                print(f"- {tabla.name}: el destino ya tiene datos, se omite")
                continue

        leida = Table(tabla.name, MetaData(), autoload_with=origen)
        columnas = [c.name for c in leida.columns if c.name in tabla.columns]
        filas, n = [], 0

        with origen.connect() as src, destino.begin() as dst:
            for fila in src.execute(select(*[leida.c[c] for c in columnas])):
                filas.append(dict(zip(columnas, fila)))
                if len(filas) >= BATCH:
                    dst.execute(tabla.insert(), filas)
                    n += len(filas)
                    filas = []
            if filas:
                dst.execute(tabla.insert(), filas)
                n += len(filas)

        total += n
        print(f"- {tabla.name}: {n} filas copiadas")

    # Ajusta contadores autoincrementales en Postgres (si alguna tabla los usa)
    if destino.dialect.name == "postgresql":
        with destino.begin() as c:
            for tabla in db.metadata.sorted_tables:
                for col in tabla.primary_key.columns:
                    if col.autoincrement is True or (
                        col.type.python_type is int and col.autoincrement == "auto"
                    ):
                        c.execute(text(
                            f"SELECT setval(pg_get_serial_sequence('{tabla.name}', '{col.name}'), "
                            f"COALESCE((SELECT MAX({col.name}) FROM {tabla.name}), 1))"
                        ))

    print(f"\nListo. {total} filas copiadas en total.")


if __name__ == "__main__":
    main()
