"""
Tests del sistema de fichaje.
Ejecutar con: pytest tests/test_fichaje.py -v
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import app as application


# ─────────────────────────────────────────────
# FIXTURES
# ─────────────────────────────────────────────

@pytest.fixture
def client(tmp_path, monkeypatch):
    """Cliente de test con BD temporal."""
    db_file = str(tmp_path / "test.db")
    qr_dir  = str(tmp_path / "qr_codes")
    os.makedirs(qr_dir, exist_ok=True)

    monkeypatch.setattr(application, "DB_PATH", db_file)
    monkeypatch.setattr(application, "QR_FOLDER", qr_dir)

    application.init_db()
    application.app.config["TESTING"] = True

    with application.app.test_client() as c:
        with c.session_transaction() as sess:
            sess["username"] = "admin"
            sess["rol"] = "admin"
        yield c


def create_emp(client, name="Ana García"):
    return client.post("/api/employees",
                       json={"name": name},
                       content_type="application/json")


# ─────────────────────────────────────────────
# TESTS – EMPLEADOS
# ─────────────────────────────────────────────

def test_crear_empleado_ok(client):
    res = create_emp(client)
    assert res.status_code == 201
    data = res.get_json()
    assert data["employee"]["name"] == "Ana García"
    assert len(data["employee"]["qr_token"]) == 32


def test_crear_empleado_sin_nombre(client):
    res = client.post("/api/employees", json={})
    assert res.status_code == 400


def test_crear_empleado_nombre_largo(client):
    res = create_emp(client, name="x" * 101)
    assert res.status_code == 400


def test_listar_empleados(client):
    create_emp(client, "Luis")
    create_emp(client, "Marta")
    res = client.get("/api/employees")
    assert res.status_code == 200
    assert len(res.get_json()) == 2


def test_eliminar_empleado(client):
    res = create_emp(client, "Pedro")
    emp_id = res.get_json()  # respuesta no devuelve id directamente
    # Obtenemos id desde listado
    lista = client.get("/api/employees").get_json()
    eid   = lista[0]["id"]

    del_res = client.delete(f"/api/employees/{eid}")
    assert del_res.status_code == 200
    assert len(client.get("/api/employees").get_json()) == 0


def test_eliminar_empleado_inexistente(client):
    res = client.delete("/api/employees/999")
    assert res.status_code == 404


# ─────────────────────────────────────────────
# TESTS – FICHAJE
# ─────────────────────────────────────────────

def get_token(client, name="Test User"):
    res = create_emp(client, name)
    return res.get_json()["employee"]["qr_token"]


def test_primer_fichaje_es_entrada(client):
    token = get_token(client)
    res   = client.post("/api/checkin", json={"qr_token": token})
    assert res.status_code == 200
    assert res.get_json()["direction"] == "IN"


def test_segundo_fichaje_es_salida(client):
    token = get_token(client)
    client.post("/api/checkin", json={"qr_token": token})

    import time; time.sleep(0.01)   # evitar protección anti-duplicado en tests
    # Forzamos bypasear la ventana de 5s en tests manipulando directamente la BD
    with application.get_db() as conn:
        conn.execute("UPDATE checkins SET ts = datetime('now','-10 seconds')")

    res = client.post("/api/checkin", json={"qr_token": token})
    assert res.status_code == 200
    assert res.get_json()["direction"] == "OUT"


def test_token_invalido(client):
    res = client.post("/api/checkin", json={"qr_token": "token_corto"})
    assert res.status_code == 400


def test_token_vacio(client):
    res = client.post("/api/checkin", json={"qr_token": ""})
    assert res.status_code == 400


def test_token_desconocido(client):
    res = client.post("/api/checkin", json={"qr_token": "a" * 32})
    assert res.status_code == 404


def test_antiduplicate(client):
    """Dos fichajes seguidos < 5s deben rechazar el segundo."""
    token = get_token(client)
    client.post("/api/checkin", json={"qr_token": token})
    res2  = client.post("/api/checkin", json={"qr_token": token})
    assert res2.status_code == 429


# ─────────────────────────────────────────────
# TESTS – LISTADO DE FICHAJES
# ─────────────────────────────────────────────

def test_listado_fichajes(client):
    token = get_token(client)
    client.post("/api/checkin", json={"qr_token": token})
    res = client.get("/api/checkins")
    assert res.status_code == 200
    assert len(res.get_json()) == 1


def test_filtro_fecha(client):
    token = get_token(client)
    client.post("/api/checkin", json={"qr_token": token})

    from datetime import date
    hoy  = date.today().isoformat()
    res  = client.get(f"/api/checkins?date={hoy}")
    assert len(res.get_json()) >= 1

    res2 = client.get("/api/checkins?date=2000-01-01")
    assert len(res2.get_json()) == 0


def test_crear_empleado_con_jornada_personalizada(client):
    res = client.post("/api/employees", json={"name": "Laura", "weekly_hours": 37.5})
    assert res.status_code == 201
    assert res.get_json()["employee"]["weekly_hours"] == 37.5

    lista = client.get("/api/employees")
    assert lista.status_code == 200
    empleado = next(e for e in lista.get_json() if e["name"] == "Laura")
    assert empleado["weekly_hours"] == 37.5


def test_checkin_devuelve_hours_summary(client):
    token = get_token(client, "Resumen User")
    res = client.post("/api/checkin", json={"qr_token": token})
    assert res.status_code == 200
    data = res.get_json()
    assert "hours_summary" in data
    assert {"hours_worked", "hours_expected", "difference", "message"} <= set(data["hours_summary"].keys())


def test_hours_summary_endpoints(client):
    token = get_token(client, "Horas User")
    client.post("/api/checkin", json={"qr_token": token})

    empleados = client.get("/api/employees").get_json()
    emp = next(e for e in empleados if e["name"] == "Horas User")

    res_single = client.get(f"/api/employees/{emp['id']}/hours")
    assert res_single.status_code == 200
    data_single = res_single.get_json()
    assert data_single["employee_id"] == emp["id"]
    assert "message" in data_single

    res_all = client.get("/api/employees/hours-summary")
    assert res_all.status_code == 200
    data_all = res_all.get_json()
    assert any(e["employee_id"] == emp["id"] for e in data_all)
