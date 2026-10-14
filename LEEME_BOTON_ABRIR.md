# Botón "Abrir" en lugar de llaves QR

Copia cada archivo sobre el del mismo nombre (misma estructura de carpetas).

Backend: models.py, config.py, routes/lockers.py, routes/locker_device.py, test_apertura_remota.py (nuevo)
Frontend: src/api.js, src/pages/admin/AdminLockers.jsx
ESP32: firmware/comandos_remotos.ino.txt (fragmento para pegar en tu .ino)

1. Reinicia el backend (`python app.py`). La tabla nueva `open_commands` se crea sola.
2. Opcional: `python test_apertura_remota.py`.
3. Frontend: `npm run dev` como siempre.
4. Pega el fragmento en el firmware y súbelo al ESP32. Sin ese paso el botón avisa al backend,
   pero la puerta no abre (el ESP32 todavía no pregunta por órdenes).

Los endpoints de llaves QR siguen en el backend (no se borró nada), solo se quitaron del panel.
