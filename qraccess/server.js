// ─────────────────────────────────────────────────────────────────────────────
//  QRAccess – Backend  (Node.js + Express)
//  Archivo: server.js
//
//  Instalación:
//    npm init -y
//    npm install express cors jsonwebtoken bcryptjs
//
//  Arranque:
//    node server.js
//
//  Por defecto escucha en http://localhost:3000
//  Los ficheros estáticos (index.html, dashboard.html) deben estar
//  en la carpeta ./public/
// ─────────────────────────────────────────────────────────────────────────────

const express    = require('express');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Clave secreta para JWT ───────────────────────────────────────────────────
// En producción ponla en una variable de entorno: process.env.JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'cambia_esta_clave_secreta_en_produccion';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
// Sirve los HTML estáticos desde la carpeta ./public
app.use(express.static(path.join(__dirname, 'public')));

// ─── Base de datos en memoria (reemplazar por BD real en producción) ──────────
// Las contraseñas están hasheadas con bcrypt
// Para generar un hash: node -e "const b=require('bcryptjs'); console.log(b.hashSync('tu_password', 10))"
const usuarios = [
  {
    id: 1,
    username: 'admin',
    // Contraseña: admin123
    passwordHash: bcrypt.hashSync('admin123', 10),
    rol: 'admin',
    nombre: 'Administrador'
  },
  {
    id: 2,
    username: 'empleado1',
    // Contraseña: emp123
    passwordHash: bcrypt.hashSync('emp123', 10),
    rol: 'empleado',
    nombre: 'Juan García'
  },
  {
    id: 3,
    username: 'empleado2',
    // Contraseña: emp123
    passwordHash: bcrypt.hashSync('emp123', 10),
    rol: 'empleado',
    nombre: 'María López'
  }
];

// Almacén de fichajes en memoria
// En producción usar una base de datos (SQLite, PostgreSQL, MongoDB…)
const fichajes = [];

// ─── Middleware de autenticación JWT ─────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch(_) {
    return res.status(401).json({ error: 'Token inválido o caducado' });
  }
}

// ─── RUTAS ────────────────────────────────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password, lat, lng } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const user = usuarios.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  // Registrar acceso con coordenadas si se proporcionaron
  console.log(`[LOGIN] ${username} | ${new Date().toISOString()} | lat=${lat} lng=${lng}`);

  // Generar JWT (caduca en 8 horas)
  const token = jwt.sign(
    { id: user.id, username: user.username, rol: user.rol, nombre: user.nombre },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    username: user.username,
    nombre:   user.nombre,
    rol:      user.rol
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  // Con JWT stateless no hace falta invalidar nada en servidor
  // Si necesitas blacklist de tokens, implementarla aquí
  console.log(`[LOGOUT] ${req.user.username} | ${new Date().toISOString()}`);
  res.json({ ok: true });
});

// POST /api/fichajes  – Registrar un fichaje tras escanear QR
app.post('/api/fichajes', authMiddleware, (req, res) => {
  const { qr } = req.body;

  if (!qr) {
    return res.status(400).json({ error: 'Código QR requerido' });
  }

  // Lógica de entrada/salida: si el último fichaje del usuario fue entrada → ahora es salida
  const fichajesUsuario = fichajes.filter(f => f.userId === req.user.id);
  const ultimo = fichajesUsuario[fichajesUsuario.length - 1];
  const tipo   = (!ultimo || ultimo.tipo === 'salida') ? 'entrada' : 'salida';

  const fichaje = {
    id:        fichajes.length + 1,
    userId:    req.user.id,
    username:  req.user.username,
    nombre:    req.user.nombre,
    qr,
    tipo,
    timestamp: new Date().toISOString()
  };

  fichajes.push(fichaje);
  console.log(`[FICHAJE] ${req.user.username} – ${tipo} – ${fichaje.timestamp} – QR: ${qr}`);

  res.json({ ok: true, tipo, timestamp: fichaje.timestamp });
});

// GET /api/fichajes  – Listar fichajes (solo admin)
app.get('/api/fichajes', authMiddleware, (req, res) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  res.json(fichajes);
});

// GET /api/me  – Datos del usuario actual
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, nombre: req.user.nombre, rol: req.user.rol });
});

// ─── Ruta catch-all: devolver index.html para rutas SPA ──────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Arrancar servidor solo cuando se ejecuta directamente ───────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 QRAccess corriendo en http://localhost:${PORT}`);
    console.log(`\n📋 Usuarios por defecto:`);
    console.log(`   admin     / admin123  (rol: admin)`);
    console.log(`   empleado1 / emp123    (rol: empleado)`);
    console.log(`   empleado2 / emp123    (rol: empleado)\n`);
  });
}

module.exports = app;
