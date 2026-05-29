// tests/api.test.js — pruebas básicas de todos los endpoints
const request = require('supertest');
const app     = require('./app');

let adminToken = '';
const API_KEY  = 'terminal_key_123456';

// ── AUTH ─────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  test('login correcto devuelve token JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    adminToken = res.body.data.token; // guardamos para los siguientes tests
  });

  test('credenciales incorrectas devuelve 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'mala' });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('campos vacíos devuelve 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.statusCode).toBe(400);
  });
});

// ── EMPLOYEES ────────────────────────────────────────────────────────────────
describe('EMPLOYEES', () => {
  let newEmployeeId;
  let newEmployeeToken;

  test('GET /api/employees sin token devuelve 401', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/employees con token devuelve lista', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/employees crea empleado con qr_token único', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'María Test' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('qr_token');
    expect(res.body.data.qr_token).toMatch(/^emp_[a-zA-Z0-9]+$/);

    newEmployeeId    = res.body.data.id;
    newEmployeeToken = res.body.data.qr_token;
  });

  test('POST /api/employees sin nombre devuelve 400', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  test('GET /api/employees/:id devuelve el empleado correcto', async () => {
    const res = await request(app)
      .get(`/api/employees/${newEmployeeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe('María Test');
  });

  // ── CHECKINS ────────────────────────────────────────────────────────────────
  describe('CHECKINS', () => {
    test('POST /api/checkins sin X-API-Key devuelve 401', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .send({ qr_token: newEmployeeToken });

      expect(res.statusCode).toBe(401);
    });

    test('POST /api/checkins primer fichaje es IN', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('X-API-Key', API_KEY)
        .send({ qr_token: newEmployeeToken });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.direction).toBe('IN');
    });

    test('POST /api/checkins segundo fichaje (inmediato) es DUPLICADO (409)', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('X-API-Key', API_KEY)
        .send({ qr_token: newEmployeeToken });

      expect(res.statusCode).toBe(409);
    });

    test('POST /api/checkins token desconocido devuelve 404', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('X-API-Key', API_KEY)
        .send({ qr_token: 'emp_tokenquenoexiste' });

      expect(res.statusCode).toBe(404); // token con formato válido pero no registrado en el sistema
    });

    test('GET /api/checkins devuelve lista de fichajes', async () => {
      const res = await request(app)
        .get('/api/checkins')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/checkins filtra por fecha con formato correcto', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .get(`/api/checkins?date=${today}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    test('GET /api/checkins con fecha incorrecta devuelve 400', async () => {
      const res = await request(app)
        .get('/api/checkins?date=ayer')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  // ── UPDATE / DELETE employees ────────────────────────────────────────────────
  test('PUT /api/employees/:id actualiza el nombre', async () => {
    const res = await request(app)
      .put(`/api/employees/${newEmployeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'María Actualizada' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe('María Actualizada');
  });

  test('PUT /api/employees/:id con status inválido devuelve 400', async () => {
    const res = await request(app)
      .put(`/api/employees/${newEmployeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspendido' });

    expect(res.statusCode).toBe(400);
  });

  test('PUT /api/employees/:id inexistente devuelve 404', async () => {
    const res = await request(app)
      .put('/api/employees/99999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nadie' });

    expect(res.statusCode).toBe(404);
  });

  test('DELETE /api/employees/:id elimina el empleado', async () => {
    // Crear uno extra para borrar
    const created = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Temporal Borrable' });

    const idBorrable = created.body.data.id;

    const del = await request(app)
      .delete(`/api/employees/${idBorrable}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(del.statusCode).toBe(200);
    expect(del.body.data.message).toMatch(/eliminado/i);

    // Verificar que ya no existe
    const check = await request(app)
      .get(`/api/employees/${idBorrable}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(check.statusCode).toBe(404);
  });

  test('DELETE /api/employees/:id inexistente devuelve 404', async () => {
    const res = await request(app)
      .delete('/api/employees/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  });

  test('GET /api/employees/:id inexistente devuelve 404', async () => {
    const res = await request(app)
      .get('/api/employees/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  });

  test('GET /api/employees/:id/qr devuelve el qr_token del empleado', async () => {
    const res = await request(app)
      .get(`/api/employees/${newEmployeeId}/qr`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('qr_token');
    expect(res.body.data.employee_id).toBe(newEmployeeId);
  });

  test('GET /api/employees/:id/qr con ID no numérico devuelve 400', async () => {
    const res = await request(app)
      .get('/api/employees/abc/qr')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
  });

  test('POST /api/checkins con empleado inactivo devuelve 403', async () => {
    // Desactivar el empleado
    await request(app)
      .put(`/api/employees/${newEmployeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });

    const res = await request(app)
      .post('/api/checkins')
      .set('X-API-Key', API_KEY)
      .send({ qr_token: newEmployeeToken });

    expect(res.statusCode).toBe(403);
  });
});

// ── TERMINALS ────────────────────────────────────────────────────────────────
describe('TERMINALS', () => {
  test('GET /api/terminals sin token devuelve 401', async () => {
    const res = await request(app).get('/api/terminals');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/terminals con token devuelve lista', async () => {
    const res = await request(app)
      .get('/api/terminals')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/terminals crea terminal con api_key', async () => {
    const res = await request(app)
      .post('/api/terminals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Kiosco Test', location: 'Planta 1' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('api_key');
    expect(res.body.data.name).toBe('Kiosco Test');
  });

  test('POST /api/terminals sin nombre devuelve 400', async () => {
    const res = await request(app)
      .post('/api/terminals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  test('POST /api/terminals sin token devuelve 401', async () => {
    const res = await request(app)
      .post('/api/terminals')
      .send({ name: 'Sin Auth' });

    expect(res.statusCode).toBe(401);
  });
});

// ── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
describe('Auth middleware', () => {
  test('Token con formato incorrecto (sin Bearer) devuelve 401', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', adminToken); // sin "Bearer "

    expect(res.statusCode).toBe(401);
  });

  test('Token manipulado devuelve 401', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', 'Bearer token.falso.aqui');

    expect(res.statusCode).toBe(401);
  });
});

// ── API-KEY MIDDLEWARE ───────────────────────────────────────────────────────
describe('apiKey middleware', () => {
  test('X-API-Key incorrecta devuelve 403', async () => {
    const res = await request(app)
      .post('/api/checkins')
      .set('X-API-Key', 'clave_que_no_existe')
      .send({ qr_token: 'emp_a1b2c3d4e5f6a1b2c3d4e5f6' });

    expect(res.statusCode).toBe(403);
  });

  test('Cabecera X-API-Key ausente devuelve 401', async () => {
    const res = await request(app)
      .post('/api/checkins')
      .send({ qr_token: 'emp_a1b2c3d4e5f6a1b2c3d4e5f6' });

    expect(res.statusCode).toBe(401);
  });
});

// ── CHECKINS – filtros ───────────────────────────────────────────────────────
describe('GET /api/checkins – filtros', () => {
  test('filtra correctamente por employee_id', async () => {
    const res = await request(app)
      .get('/api/checkins?employee_id=1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('employee_id no numérico devuelve 400', async () => {
    const res = await request(app)
      .get('/api/checkins?employee_id=abc')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
  });
});
