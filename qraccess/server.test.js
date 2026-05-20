// server.test.js — pruebas unitarias del servidor qraccess
// Ejecutar con: npm test

'use strict';

const request = require('supertest');
const app     = require('./server');

let adminToken    = '';
let empleadoToken = '';

// ── AUTH – LOGIN ─────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  test('login correcto (admin) devuelve token JWT y datos de usuario', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.rol).toBe('admin');
    expect(res.body.username).toBe('admin');
    adminToken = res.body.token;
  });

  test('login correcto (empleado) devuelve token JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'empleado1', password: 'emp123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.rol).toBe('empleado');
    empleadoToken = res.body.token;
  });

  test('contraseña incorrecta devuelve 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'mala_clave' });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('usuario inexistente devuelve 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nadie', password: 'algo' });

    expect(res.statusCode).toBe(401);
  });

  test('campos vacíos devuelven 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('solo username sin password devuelve 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin' });

    expect(res.statusCode).toBe(400);
  });
});

// ── AUTH – LOGOUT ────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  test('logout con token válido devuelve ok:true', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('logout sin token devuelve 401', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.statusCode).toBe(401);
  });

  test('logout con token manipulado devuelve 401', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer token.falso.aqui');

    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/me ──────────────────────────────────────────────────────────────
describe('GET /api/me', () => {
  test('devuelve datos del usuario autenticado', async () => {
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.username).toBe('admin');
    expect(res.body.rol).toBe('admin');
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('nombre');
  });

  test('sin token devuelve 401', async () => {
    const res = await request(app).get('/api/me');
    expect(res.statusCode).toBe(401);
  });
});

// ── POST /api/fichajes ───────────────────────────────────────────────────────
describe('POST /api/fichajes', () => {
  test('fichaje sin QR devuelve 400', async () => {
    const res = await request(app)
      .post('/api/fichajes')
      .set('Authorization', `Bearer ${empleadoToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('primer fichaje con QR válido devuelve tipo "entrada"', async () => {
    const res = await request(app)
      .post('/api/fichajes')
      .set('Authorization', `Bearer ${empleadoToken}`)
      .send({ qr: 'codigo-qr-empleado1' });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.tipo).toBe('entrada');
    expect(res.body).toHaveProperty('timestamp');
  });

  test('segundo fichaje inmediato es "salida" (lógica IN/OUT)', async () => {
    const res = await request(app)
      .post('/api/fichajes')
      .set('Authorization', `Bearer ${empleadoToken}`)
      .send({ qr: 'codigo-qr-empleado1' });

    expect(res.statusCode).toBe(200);
    expect(res.body.tipo).toBe('salida');
  });

  test('tercer fichaje vuelve a ser "entrada"', async () => {
    const res = await request(app)
      .post('/api/fichajes')
      .set('Authorization', `Bearer ${empleadoToken}`)
      .send({ qr: 'codigo-qr-empleado1' });

    expect(res.statusCode).toBe(200);
    expect(res.body.tipo).toBe('entrada');
  });

  test('sin token devuelve 401', async () => {
    const res = await request(app)
      .post('/api/fichajes')
      .send({ qr: 'codigo-qr-test' });

    expect(res.statusCode).toBe(401);
  });

  test('diferente usuario tiene su propia secuencia entrada/salida', async () => {
    const res = await request(app)
      .post('/api/fichajes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ qr: 'codigo-qr-admin' });

    expect(res.statusCode).toBe(200);
    // El admin no ha fichado antes, así que debe ser "entrada"
    expect(res.body.tipo).toBe('entrada');
  });
});

// ── GET /api/fichajes ────────────────────────────────────────────────────────
describe('GET /api/fichajes', () => {
  test('admin puede listar todos los fichajes', async () => {
    const res = await request(app)
      .get('/api/fichajes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('empleado no puede listar fichajes (403)', async () => {
    const res = await request(app)
      .get('/api/fichajes')
      .set('Authorization', `Bearer ${empleadoToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  test('sin token devuelve 401', async () => {
    const res = await request(app).get('/api/fichajes');
    expect(res.statusCode).toBe(401);
  });
});

// ── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
describe('Middleware de autenticación JWT', () => {
  test('cabecera Authorization ausente devuelve 401', async () => {
    const res = await request(app).get('/api/me');
    expect(res.statusCode).toBe(401);
  });

  test('token sin prefijo Bearer devuelve 401', async () => {
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', adminToken); // sin "Bearer "

    expect(res.statusCode).toBe(401);
  });

  test('token expirado / inválido devuelve 401', async () => {
    const expiredToken =
      'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.signature_invalida';
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.statusCode).toBe(401);
  });
});
