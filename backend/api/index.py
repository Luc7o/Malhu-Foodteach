"""Punto de entrada del backend en Vercel (función serverless)."""
import os
import sys

# Asegura que se puedan importar app.py, config.py, etc. desde la carpeta backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from wsgi import app  # noqa: E402,F401  (Vercel busca la variable "app")
