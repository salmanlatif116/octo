import os
import tempfile
import uuid

# Point the app at a throwaway data dir + SQLite BEFORE it is imported.
_tmp = tempfile.mkdtemp(prefix="octo-test-")
os.environ["DATA_DIR"] = _tmp
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.replace(os.sep, '/')}/test.db"
os.environ["STATIC_DIR"] = os.path.join(_tmp, "no-frontend")
os.environ["ADMIN_USER_ID"] = "admin"
os.environ["ADMIN_PASSWORD"] = "admin-pass"
os.environ["LOGIN_MAX_FAILURES"] = "5"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.routers import auth as auth_router  # noqa: E402

# A 1x1 PNG
PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d49444154789c6360000002000001e221bc330000000049454e44ae426082"
)


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_throttle():
    auth_router.reset_throttle()


def login(client, user_id, password):
    r = client.post("/api/v1/auth/login/", json={"user_id": user_id, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def admin(client):
    return login(client, "admin", "admin-pass")


@pytest.fixture()
def customer(client, admin):
    """A fresh customer created by the admin. Returns (user_id, auth headers)."""
    uid = f"T{uuid.uuid4().hex[:7]}"
    r = client.post(
        "/api/v1/admin/users/",
        json={"user_id": uid, "name": "Test Customer", "password": "pass1234", "monthly_amount": 5000},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    return uid, login(client, uid, "pass1234")
