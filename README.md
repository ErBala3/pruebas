# Sistema de Fichaje con QR

Sistema completo de fichaje por código QR con backend Python/Flask,
base de datos SQLite y frontend web con escáner de cámara.

## Estructura del proyecto

```
fichaje_qr/
├── app.py                  ← Backend Flask (API + rutas)
├── requirements.txt
├── fichaje.db              ← Se crea automáticamente al arrancar
├── static/
│   └── qr_codes/           ← Imágenes QR generadas
├── templates/
│   ├── kiosk.html          ← Pantalla de fichaje (cámara)
│   └── admin.html          ← Panel de administración
└── tests/
    └── test_fichaje.py     ← Suite de tests con pytest
```

## Instalación

```bash
# 1. Crea y activa un entorno virtual
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# 2. Instala dependencias
pip install -r requirements.txt

# 3. Arranca el servidor
python app.py
```

## URLs

| URL | Descripción |
|-----|-------------|
| `http://localhost:5000/` | Kiosco de escaneo QR |
| `http://localhost:5000/admin` | Panel de administración |

## API REST

### Empleados

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/employees` | Crear empleado `{"name": "..."}` |
| `GET` | `/api/employees` | Listar todos |
| `DELETE` | `/api/employees/<id>` | Eliminar empleado |
| `GET` | `/api/employees/<id>/qr` | Descargar imagen QR |

### Fichajes

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/checkin` | Registrar fichaje `{"qr_token": "..."}` |
| `GET` | `/api/checkins` | Listar fichajes `?date=YYYY-MM-DD&employee_id=1` |

## Tests

```bash
pytest tests/test_fichaje.py -v
```

## Flujo de uso

1. En el **panel admin**: crea un empleado → descarga su QR → imprímelo o muéstralo en móvil.
2. En el **kiosco**: acerca el QR a la cámara → el sistema registra IN o OUT automáticamente.
3. Consulta el historial de fichajes filtrando por fecha o empleado.
4. Exporta a CSV desde el panel admin.

## Seguridad (producción)

- Añade autenticación al panel admin (Flask-Login o token fijo en cabecera).
- Usa HTTPS (nginx + certbot).
- Configura `SECRET_KEY` en Flask con un valor aleatorio largo.
- Haz backup periódico de `fichaje.db`.
