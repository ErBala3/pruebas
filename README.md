# QRAccess — Sistema de Fichaje por Código QR

Guía completa para empresas que deseen implantar el sistema de control de presencia QRAccess.

---

## Índice

1. [Descripción general](#descripción-general)
2. [Requisitos del sistema](#requisitos-del-sistema)
3. [Arquitectura](#arquitectura)
4. [Instalación](#instalación)
   - [Backend Python (recomendado)](#backend-python-recomendado)
   - [Backend Node.js (alternativo)](#backend-nodejs-alternativo)
5. [Configuración inicial](#configuración-inicial)
6. [Uso del sistema](#uso-del-sistema)
   - [Panel de administración](#panel-de-administración)
   - [Gestión de empleados](#gestión-de-empleados)
   - [Kiosco de fichaje](#kiosco-de-fichaje)
   - [Consulta de registros](#consulta-de-registros)
   - [Exportar a CSV](#exportar-a-csv)
7. [API REST](#api-rest)
8. [Seguridad](#seguridad)
9. [Despliegue en producción](#despliegue-en-producción)
10. [Preguntas frecuentes](#preguntas-frecuentes)
11. [Soporte](#soporte)

---

## Descripción general

QRAccess es un sistema de control de presencia basado en códigos QR. Cada empleado recibe un código QR único e intransferible. Al acercarlo a cualquier dispositivo con cámara conectado al sistema (tablet, PC, móvil), el sistema registra automáticamente la entrada o la salida, alternando entre ambas según el último registro del empleado.

**Casos de uso tipicos:**

- Empresas con uno o varios centros de trabajo que necesitan controlar horarios de entrada y salida.
- Negocios que quieren eliminar el fichaje manual en papel o en relojes de fichar tradicionales.
- Organizaciones que necesitan exportar los datos de asistencia para nóminas o auditorías.

**Resumen de funcionalidades:**

| Funcionalidad | Descripción |
|---|---|
| Registro de empleados | Alta, baja y edición desde el panel de administración |
| Generación de QR | Cada empleado tiene un QR único descargable e imprimible |
| Fichaje por cámara | Escaner web en tiempo real desde cualquier navegador moderno |
| Registro automático | El sistema determina si es entrada (IN) o salida (OUT) automáticamente |
| Historial de fichajes | Consulta filtrada por empleado y/o fecha |
| Exportación CSV | Descarga de registros en formato compatible con Excel |
| Panel de administración | Gestión completa de empleados y registros |
| Autenticación segura | Acceso protegido con usuario y contraseña |

---

## Requisitos del sistema

### Para el servidor (donde se instala el software)

| Componente | Versión mínima |
|---|---|
| Python | 3.10 o superior |
| pip | incluido con Python 3 |
| Sistema operativo | Windows 10/11, macOS 12+, Ubuntu 20.04+ |
| RAM | 512 MB libres |
| Almacenamiento | 200 MB para la aplicación; espacio adicional para la base de datos según volumen de datos |

> Si se usa el backend alternativo Node.js:
> - Node.js 18 o superior
> - npm 9 o superior

### Para los dispositivos de fichaje (kiosco)

- Cualquier dispositivo con navegador web moderno (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+).
- Cámara integrada o externa con acceso permitido desde el navegador.
- Conexión a la misma red local que el servidor (o acceso a Internet si el servidor esta publicado).

### Para los empleados

- Código QR impreso en papel, tarjeta plastificada o en pantalla de móvil.
- No se requiere instalar ninguna aplicación en el dispositivo del empleado.

---

## Arquitectura

El sistema se compone de tres capas:

```
+------------------+        HTTP / REST        +---------------------+
|  Navegador web   | <-----------------------> |  Backend (servidor) |
|  (kiosco/admin)  |                           |  Python + Flask     |
+------------------+                           |  Puerto 5000        |
                                               +----------+----------+
                                                          |
                                               +----------v----------+
                                               |   Base de datos     |
                                               |   SQLite            |
                                               |   fichaje.db        |
                                               +---------------------+
```

**Componentes principales:**

| Directorio | Descripción |
|---|---|
| `fichaje_qr/` | Backend principal (Python/Flask) con base de datos SQLite |
| `backend/` | Backend alternativo (Node.js/Express) con autenticación JWT |
| `qraccess/` | Versión anterior del backend Node.js (referencia) |
| `index.html` | Pantalla de login del panel web |
| `admin.html` | Panel de administración |
| `dashboard.html` | Vista de fichajes del panel web |

---

## Instalación

### Backend Python (recomendado)

Este es el backend más completo y el que se recomienda para producción.

**Paso 1: Descargar el proyecto**

```bash
git clone https://github.com/ErBala3/pruebas.git
cd pruebas/fichaje_qr
```

O descargue el ZIP desde la página del repositorio y descomprima la carpeta `fichaje_qr`.

**Paso 2: Crear un entorno virtual**

```bash
# Linux / macOS
python3 -m venv venv
source venv/bin/activate

# Windows (PowerShell)
python -m venv venv
venv\Scripts\Activate.ps1

# Windows (CMD)
python -m venv venv
venv\Scripts\activate.bat
```

**Paso 3: Instalar dependencias**

```bash
pip install -r requirements.txt
```

Las dependencias instaladas son:

| Paquete | Uso |
|---|---|
| `flask` | Servidor web y API REST |
| `qrcode[pil]` | Generación de imágenes QR |
| `pytest` | Suite de tests (desarrollo) |

**Paso 4: Arrancar el servidor**

```bash
python app.py
```

El servidor se inicia en `http://localhost:5000`. La base de datos `fichaje.db` se crea automáticamente en el primer arranque junto con el usuario administrador por defecto.

**Paso 5: Abrir el sistema en el navegador**

- Panel de administración: `http://localhost:5000/admin`
- Kiosco de fichaje: `http://localhost:5000/`

---

### Backend Node.js (alternativo)

Disponible en la carpeta `backend/`. Sigue los siguientes pasos si prefiere la versión Node.js.

**Paso 1: Instalar dependencias**

```bash
cd backend
npm install
```

**Paso 2: Arrancar el servidor**

```bash
npm start          # producción
npm run dev        # desarrollo (recarga automática)
```

El servidor se inicia en `http://localhost:3001`.

---

## Configuración inicial

Al arrancar el servidor por primera vez se crean automáticamente:

- La base de datos SQLite (`fichaje.db`).
- La carpeta `static/qr_codes/` para almacenar las imágenes QR.
- El usuario administrador por defecto.

**Credenciales de acceso por defecto:**

| Campo | Valor |
|---|---|
| Usuario | `admin` |
| Contraseña | `admin123` |

> **Importante:** Cambie la contraseña del administrador antes de poner el sistema en producción. Consulte la sección [Seguridad](#seguridad).

**Variable de entorno para la clave secreta de sesión:**

```bash
# Linux / macOS
export SECRET_KEY="una_clave_larga_y_aleatoria"

# Windows (PowerShell)
$env:SECRET_KEY = "una_clave_larga_y_aleatoria"
```

Si no se define `SECRET_KEY`, el sistema genera una clave aleatoria en cada arranque (las sesiónes se inválidan al reiniciar el servidor).

---

## Uso del sistema

### Panel de administración

Acceda a `http://<direccion-del-servidor>:5000/admin` desde cualquier navegador.

El panel esta dividido en las siguientes secciónes:

| Sección | Descripción |
|---|---|
| Empleados | Crear, ver y eliminar empleados; descargar QR individual |
| Fichajes | Ver el historial completo; filtrar por empleado y fecha; exportar CSV |
| Usuarios | Gestiónar las cuentas de acceso al panel de administración |

---

### Gestión de empleados

**Crear un empleado:**

1. Abra el panel de administración.
2. Vaya a la sección **Empleados**.
3. Introduzca el nombre completo del empleado y haga clic en **Crear empleado**.
4. El sistema genera automáticamente un código QR único para ese empleado.

**Descargar el QR:**

1. En la lista de empleados, haga clic en el icono de descarga junto al empleado.
2. Se descargara una imagen PNG con el código QR.
3. Imprima el QR en una tarjeta o pegatina y entréguésela al empleado.

**Eliminar un empleado:**

1. En la lista de empleados, haga clic en el icono de papelera junto al empleado.
2. Confirme la eliminacion.

> Los fichajes históricos del empleado eliminado se conservan en la base de datos para fines de auditoría.

---

### Kiosco de fichaje

La pantalla de kiosco es la interfaz que ven los empleados al fichar. Se accede en `http://<direccion-del-servidor>:5000/`.

**Configuración del dispositivo kiosco:**

1. Coloque un dispositivo (tablet, PC, móvil) en la entrada o zona de fichaje.
2. Abra el navegador y navegue a la URL del kiosco.
3. El navegador solicitará permiso para usar la cámara. Haga clic en **Permitir**.
4. La pantalla mostrará la imagen de la cámara en tiempo real.

**Proceso de fichaje para el empleado:**

1. El empleado acerca su código QR a la cámara.
2. El sistema detecta el QR y válida el código en la base de datos.
3. Si el código es válido, el sistema registra automáticamente:
   - **Entrada (IN)** si el último registro del empleado fue una salida (o no hay registros previos).
   - **Salida (OUT)** si el último registro del empleado fue una entrada.
4. La pantalla muestra un mensaje de confirmación con el nombre del empleado y el tipo de fichaje.

**Comportamiento ante errores:**

| Situación | Mensaje mostrado |
|---|---|
| QR no reconocido | "Código QR no válido" |
| Error de cámara | "No se puede acceder a la cámara. Verifique los permisos." |
| Error de conexión | "Error de conexión con el servidor" |

---

### Consulta de registros

En el panel de administración, sección **Fichajes**, puede:

- Ver todos los registros ordenados por fecha y hora (mas recientes primero).
- Filtrar por **empleado** usando el desplegable.
- Filtrar por **fecha** usando el selector de fecha.
- Combinar ambos filtros simultáneamente.

Cada registro muestra:

| Campo | Descripción |
|---|---|
| Empleado | Nombre del empleado |
| Tipo | IN (entrada) o OUT (salida) |
| Fecha y hora | Fecha y hora exacta del fichaje |

---

### Exportar a CSV

1. En la sección **Fichajes**, aplique los filtros que desee (o deje sin filtros para exportar todo).
2. Haga clic en el boton **Exportar CSV**.
3. Se descargara un archivo con el nombre `fichajes_YYYY-MM-DD.csv`.
4. El archivo se puede abrir directamente en Excel, LibreOffice Calc o cualquier herramienta de hojas de calculo.

**Formato del archivo CSV:**

```
"Empleado","Tipo","Fecha y hora"
"Ana Garcia","IN","2025-01-15 08:02:34"
"Ana Garcia","OUT","2025-01-15 17:01:10"
"Carlos Lopez","IN","2025-01-15 08:15:22"
```

---

## API REST

El sistema expone una API REST que permite integrarlo con otros sistemas de la empresa (ERP, nóminas, etc.).

### Autenticación

Todos los endpoints protegidos requieren una sesión activa iniciada a traves de:

```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Respuesta exitosa:

```json
{
  "message": "Login correcto",
  "rol": "admin"
}
```

### Endpoints de empleados

| Metodo | Ruta | Descripción | Requiere auth |
|---|---|---|---|
| `GET` | `/api/employees` | Listar todos los empleados | Si |
| `POST` | `/api/employees` | Crear un nuevo empleado | Si |
| `DELETE` | `/api/employees/<id>` | Eliminar un empleado | Si |
| `GET` | `/api/employees/<id>/qr` | Descargar imagen QR del empleado | Si |

**Crear empleado — ejemplo:**

```bash
curl -X POST http://localhost:5000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name": "Ana Garcia"}'
```

Respuesta:

```json
{
  "id": 1,
  "name": "Ana Garcia",
  "qr_token": "emp_a1b2c3d4e5f6",
  "created_at": "2025-01-15 08:00:00"
}
```

### Endpoints de fichajes

| Metodo | Ruta | Descripción | Requiere auth |
|---|---|---|---|
| `POST` | `/api/checkin` | Registrar un fichaje | No (solo token QR válido) |
| `GET` | `/api/checkins` | Consultar fichajes | Si |
| `DELETE` | `/api/checkins/<id>` | Eliminar un fichaje | Si |

**Registrar fichaje — ejemplo:**

```bash
curl -X POST http://localhost:5000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"qr_token": "emp_a1b2c3d4e5f6"}'
```

Respuesta:

```json
{
  "direction": "IN",
  "employee": "Ana Garcia",
  "ts": "2025-01-15 08:02:34"
}
```

**Consultar fichajes con filtros — ejemplos:**

```bash
# Todos los fichajes del dia 2025-01-15
GET /api/checkins?date=2025-01-15

# Todos los fichajes del empleado con id=1
GET /api/checkins?employee_id=1

# Combinado
GET /api/checkins?date=2025-01-15&employee_id=1
```

### Endpoints de usuarios del sistema

| Metodo | Ruta | Descripción | Requiere auth |
|---|---|---|---|
| `GET` | `/api/users` | Listar usuarios administradores | Si |
| `POST` | `/api/users` | Crear un nuevo usuario administrador | Si |
| `DELETE` | `/api/users/<id>` | Eliminar un usuario | Si |

---

## Seguridad

### Cambiar la contraseña de administrador

El sistema no dispone todavia de formulario de cambio de contraseña en el panel. Para cambiar la contraseña, use la API directamente o modifique la base de datos:

```bash
# Con Python en el directorio fichaje_qr/
python3 -c "
from werkzeug.security import generate_password_hash
import sqlite3
new_password = 'NuevaContraseñaSegura2025!'
h = generate_password_hash(new_password)
conn = sqlite3.connect('fichaje.db')
conn.execute('UPDATE users SET password=? WHERE username=\"admin\"', (h,))
conn.commit()
conn.close()
print('Contraseña actualizada correctamente')
"
```

### Recomendaciones de seguridad en producción

| Medida | Descripción |
|---|---|
| Clave secreta de sesión | Defina `SECRET_KEY` como variable de entorno con un valor aleatorio largo (minimo 32 caracteres) |
| HTTPS | Configure un proxy inverso (nginx o Apache) con un certificado SSL (Let's Encrypt es gratuito) |
| Contraseña de administrador | Cambie la contraseña por defecto antes de la puesta en marcha |
| Acceso a red | Restrinja el acceso al panel de administración a la red interna de la empresa |
| Backup de la base de datos | Haga copias periodicas del archivo `fichaje.db` |
| Actualizaciones | Mantenga Python y las dependencias actualizadas |

### Como configurar HTTPS con nginx (Linux)

```nginx
server {
    listen 443 ssl;
    server_name fichaje.miempresa.com;

    ssl_certificate     /etc/letsencrypt/live/fichaje.miempresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fichaje.miempresa.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## Despliegue en producción

### Opcion A: Servidor Linux con systemd

Cree el archivo `/etc/systemd/system/qraccess.service`:

```ini
[Unit]
Description=QRAccess - Sistema de Fichaje
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/qraccess/fichaje_qr
Environment="SECRET_KEY=su_clave_secreta_aqui"
ExecStart=/opt/qraccess/fichaje_qr/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Activar e iniciar el servicio:

```bash
sudo systemctl daemon-reload
sudo systemctl enable qraccess
sudo systemctl start qraccess
sudo systemctl status qraccess
```

### Opcion B: Docker

Cree un archivo `Dockerfile` en el directorio `fichaje_qr/`:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV SECRET_KEY=cambiar_en_producción
EXPOSE 5000
CMD ["python", "app.py"]
```

Construir y ejecutar:

```bash
docker build -t qraccess .
docker run -d \
  -p 5000:5000 \
  -v qraccess_data:/app \
  -e SECRET_KEY="su_clave_secreta" \
  --name qraccess \
  qraccess
```

### Opcion C: Windows (servicio con NSSM)

1. Descargue NSSM desde https://nssm.cc
2. Abra CMD como administrador:

```cmd
nssm install QRAccess "C:\qraccess\fichaje_qr\venv\Scripts\python.exe" "C:\qraccess\fichaje_qr\app.py"
nssm set QRAccess AppDirectory "C:\qraccess\fichaje_qr"
nssm set QRAccess AppEnvironmentExtra SECRET_KEY=su_clave_secreta
nssm start QRAccess
```

---

## Preguntas frecuentes

**El escaner de la cámara no funciona en el kiosco. Que hago?**

El navegador requiere que el sitio sea servido por HTTPS (o desde `localhost`) para permitir el acceso a la cámara. Si accede desde otro dispositivo de la red local usando la IP del servidor (ej. `http://192.168.1.10:5000`), el navegador bloqueara la cámara. Soluciones:
- Configure HTTPS con nginx y un certificado SSL (recomendado para producción).
- En redes locales de confianza, puede usar Chrome con el flag `--unsafely-treat-insecure-origin-as-secure` (solo para pruebas).

---

**Un empleado perdio su tarjeta QR. Como genero uno nuevo?**

Actualmente el QR esta vinculado al token del empleado. Para regenerar el QR:
1. Elimine el empleado desde el panel de administración.
2. Cree el empleado de nuevo con el mismo nombre.
3. Descargue e imprima el nuevo QR.

Los fichajes históricos anteriores se conservan en la base de datos.

---

**Cuantos empleados puede gestiónar el sistema?**

SQLite soporta millones de registros. El sistema es apto para empresas de hasta varios cientos de empleados sin necesidad de cambiar la base de datos. Para volumen muy alto (miles de fichajes por hora), se recomienda migrar a PostgreSQL.

---

**El servidor se reinicia y las sesiónes se inválidan. Como evitarlo?**

Defina la variable de entorno `SECRET_KEY` con un valor fijo (no generado aleatoriamente). Consulte la sección [Configuración inicial](#configuración-inicial).

---

**Puedo instalar el sistema en la nube?**

Si. Puede usar cualquier proveedor (AWS, Azure, Google Cloud, DigitalOcean, Hetzner, etc.). Siga la guia de despliegue con Docker o systemd y configure HTTPS con su dominio.

---

**Como hago backup de los datos?**

Copie periodicamente el archivo `fichaje.db` a un lugar seguro:

```bash
# Linux — copia diaria con cron
0 2 * * * cp /opt/qraccess/fichaje_qr/fichaje.db /backups/fichaje_$(date +\%Y\%m\%d).db
```

En Windows, programe una tarea en el Programador de tareas que copie el archivo.

---

**El sistema viene con integración con software de nóminas?**

No de forma nativa, pero la exportación a CSV es compatible con la mayoria de programas de gestión de nóminas. Ademas, la API REST permite integraciónes personalizadas con cualquier sistema externo que soporte peticiones HTTP.

---

## Soporte

Para incidencias tecnicas o consultas sobre el sistema, contacte con el proveedor que le suministro el software.

Antes de contactar, recoja la siguiente informacion para agilizar el soporte:

1. Versión del sistema operativo del servidor.
2. Versión de Python (`python --versión`).
3. Mensaje de error exacto que aparece (captura de pantalla o texto del terminal).
4. Pasos que realizaba cuando se produjo el error.

---

*QRAccess — Sistema de Fichaje por Código QR*
