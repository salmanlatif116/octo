from tests.conftest import PNG, login


# ---- authentication -------------------------------------------------------

def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok", "database": "up"}


def test_login_returns_tokens_and_role(client):
    r = client.post("/api/v1/auth/login/", json={"user_id": "admin", "password": "admin-pass"})
    assert r.status_code == 200
    body = r.json()
    assert body["user"] == {"user_id": "admin", "name": "Administrator", "role": "admin", "status": 0}
    assert body["access_token"] and body["refresh_token"]
    assert r.headers["x-request-id"]


def test_login_is_case_insensitive_on_user_id(client):
    assert client.post("/api/v1/auth/login/", json={"user_id": "ADMIN", "password": "admin-pass"}).status_code == 200


def test_wrong_password_is_rejected(client):
    r = client.post("/api/v1/auth/login/", json={"user_id": "admin", "password": "nope"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Wrong User ID or password"


def test_login_locks_after_repeated_failures(client):
    for _ in range(5):
        assert client.post("/api/v1/auth/login/", json={"user_id": "ghost", "password": "x"}).status_code == 401
    assert client.post("/api/v1/auth/login/", json={"user_id": "ghost", "password": "x"}).status_code == 429


def test_refresh_gives_new_tokens_and_access_token_cannot_refresh(client):
    tokens = client.post("/api/v1/auth/login/", json={"user_id": "admin", "password": "admin-pass"}).json()
    ok = client.post("/api/v1/auth/refresh/", json={"refresh_token": tokens["refresh_token"]})
    assert ok.status_code == 200 and ok.json()["access_token"]
    bad = client.post("/api/v1/auth/refresh/", json={"refresh_token": tokens["access_token"]})
    assert bad.status_code == 401


def test_protected_routes_need_a_token(client):
    assert client.get("/api/v1/auth/me/").status_code == 401
    assert client.get("/api/v1/me/summary/").status_code == 401
    assert client.get("/api/v1/admin/users/").status_code == 401
    assert client.get("/api/v1/auth/me/", headers={"Authorization": "Bearer garbage"}).status_code == 401


# ---- roles ----------------------------------------------------------------

def test_customer_cannot_use_admin_endpoints(client, customer):
    _, headers = customer
    assert client.get("/api/v1/admin/users/", headers=headers).status_code == 403
    assert client.get("/api/v1/admin/logs/", headers=headers).status_code == 403
    assert client.patch("/api/v1/admin/users/whoever/status/", json={"status": 1}, headers=headers).status_code == 403


def test_admin_has_no_customer_summary(client, admin):
    assert client.get("/api/v1/me/summary/", headers=admin).status_code == 403


# ---- the monthly flow -----------------------------------------------------

def test_new_customer_owes_this_month_and_is_inactive(client, customer):
    _, headers = customer
    s = client.get("/api/v1/me/summary/", headers=headers).json()
    assert s["monthly_amount"] == 5000
    assert s["outstanding_amount"] == 5000
    assert len(s["unpaid_months"]) == 1
    assert s["status"] == 0 and s["active"] is False  # nothing paid yet


def test_upload_receipt_pays_the_month(client, customer):
    _, headers = customer
    r = client.post("/api/v1/me/receipts/", files={"file": ("r.png", PNG, "image/png")}, headers=headers)
    assert r.status_code == 201, r.text
    assert r.json()["amount"] == 5000 and r.json()["method"] is None
    s = client.get("/api/v1/me/summary/", headers=headers).json()
    assert s["outstanding_amount"] == 0 and s["active"] is True
    assert len(client.get("/api/v1/me/receipts/", headers=headers).json()) == 1
    # nothing left to pay
    again = client.post("/api/v1/me/receipts/", files={"file": ("r.png", PNG, "image/png")}, headers=headers)
    assert again.status_code == 409


def test_upload_rejects_non_images_and_empty_files(client, customer):
    _, headers = customer
    bad = client.post("/api/v1/me/receipts/", files={"file": ("virus.png", b"MZ\x90\x00 not an image", "image/png")}, headers=headers)
    assert bad.status_code == 415
    empty = client.post("/api/v1/me/receipts/", files={"file": ("e.png", b"", "image/png")}, headers=headers)
    assert empty.status_code == 422


def test_simulated_jazzcash_payment_records_a_receipt(client, customer):
    _, headers = customer
    bad = client.post("/api/v1/me/pay/", json={"method": "jazzcash", "account_number": "123"}, headers=headers)
    assert bad.status_code == 422
    ok = client.post("/api/v1/me/pay/", json={"method": "jazzcash", "account_number": "03001234567"}, headers=headers)
    assert ok.status_code == 201
    assert ok.json()["method"] == "jazzcash" and ok.json()["reference"] == "03••••••567"
    assert client.get("/api/v1/me/summary/", headers=headers).json()["outstanding_amount"] == 0


def test_simulated_card_payment_validates_card_and_expiry(client, customer):
    _, headers = customer
    expired = client.post("/api/v1/me/pay/", json={"method": "bank", "card_number": "4242 4242 4242 4242", "card_expiry": "01/20"}, headers=headers)
    assert expired.status_code == 422
    ok = client.post("/api/v1/me/pay/", json={"method": "bank", "card_number": "4242 4242 4242 4242", "card_expiry": "12/45"}, headers=headers)
    assert ok.status_code == 201 and ok.json()["reference"] == "•••• 4242"


def test_paying_does_not_unblock_only_the_admin_does(client, admin, customer):
    uid, headers = customer
    r = client.patch(f"/api/v1/admin/users/{uid}/status/", json={"status": 1}, headers=admin)
    assert r.status_code == 200 and r.json()["status"] == 1
    assert client.get("/api/v1/me/summary/", headers=headers).json()["active"] is False

    client.post("/api/v1/me/receipts/", files={"file": ("r.png", PNG, "image/png")}, headers=headers)
    s = client.get("/api/v1/me/summary/", headers=headers).json()
    assert s["outstanding_amount"] == 0 and s["status"] == 1 and s["active"] is False  # still blocked

    client.patch(f"/api/v1/admin/users/{uid}/status/", json={"status": 0}, headers=admin)
    s = client.get("/api/v1/me/summary/", headers=headers).json()
    assert s["status"] == 0 and s["active"] is True


# ---- receipt files --------------------------------------------------------

def test_receipt_file_is_private_to_owner_and_admin(client, admin, customer):
    uid, headers = customer
    rid = client.post("/api/v1/me/receipts/", files={"file": ("r.png", PNG, "image/png")}, headers=headers).json()["id"]
    url = f"/api/v1/receipts/{rid}/file/"

    assert client.get(url).status_code == 401
    own = client.get(url, headers=headers)
    assert own.status_code == 200 and own.content == PNG and own.headers["content-type"] == "image/png"
    assert client.get(url, headers=admin).status_code == 200

    other_uid = f"O{uid[1:]}"
    client.post("/api/v1/admin/users/", json={"user_id": other_uid, "name": "Other", "password": "pass1234"}, headers=admin)
    other = login(client, other_uid, "pass1234")
    assert client.get(url, headers=other).status_code == 404


# ---- admin ----------------------------------------------------------------

def test_admin_creates_users_and_duplicates_are_refused(client, admin):
    body = {"user_id": "DUP0001", "name": "Dup", "password": "pass1234"}
    assert client.post("/api/v1/admin/users/", json=body, headers=admin).status_code == 201
    assert client.post("/api/v1/admin/users/", json={**body, "user_id": "dup0001"}, headers=admin).status_code == 409  # case-insensitive
    assert client.post("/api/v1/admin/users/", json=body, headers=admin).status_code == 409
    assert client.post("/api/v1/admin/users/", json={**body, "user_id": "x y"}, headers=admin).status_code == 422


def test_admin_user_list_detail_and_receipts_views(client, admin, customer):
    uid, headers = customer
    row = next(u for u in client.get("/api/v1/admin/users/", headers=admin).json() if u["user_id"] == uid)
    assert row["receipt"] is None and row["owes"] is True and row["status"] == 0

    month_view = client.get("/api/v1/admin/receipts/", headers=admin).json()
    assert uid in [m["user_id"] for m in month_view["missing"]]

    client.post("/api/v1/me/receipts/", files={"file": ("r.png", PNG, "image/png")}, headers=headers)
    month_view = client.get("/api/v1/admin/receipts/", headers=admin).json()
    assert uid in [r["user_id"] for r in month_view["receipts"]]
    assert uid not in [m["user_id"] for m in month_view["missing"]]

    detail = client.get(f"/api/v1/admin/users/{uid}/", headers=admin).json()
    assert detail["unpaid_count"] == 0 and detail["months"][0]["receipt"]["user_name"] == "Test Customer"
    assert client.get("/api/v1/admin/users/nobody/", headers=admin).status_code == 404
    assert client.get("/api/v1/admin/users/?month=oops", headers=admin).status_code == 422


def test_admin_can_reset_password_and_change_amount(client, admin, customer):
    uid, _ = customer
    assert client.put(f"/api/v1/admin/users/{uid}/password/", json={"password": "newpass99"}, headers=admin).status_code == 204
    assert client.post("/api/v1/auth/login/", json={"user_id": uid, "password": "pass1234"}).status_code == 401
    assert client.post("/api/v1/auth/login/", json={"user_id": uid, "password": "newpass99"}).status_code == 200
    r = client.patch(f"/api/v1/admin/users/{uid}/", json={"monthly_amount": 7000}, headers=admin)
    assert r.json()["monthly_amount"] == 7000
    assert client.get("/api/v1/admin/months/", headers=admin).json()


# ---- logs -----------------------------------------------------------------

def test_activity_log_records_who_did_what_without_secrets(client, admin, customer):
    uid, _ = customer
    client.patch(f"/api/v1/admin/users/{uid}/status/", json={"status": 1}, headers=admin)
    client.post("/api/v1/auth/login/", json={"user_id": uid, "password": "wrong-password"})

    items = client.get("/api/v1/admin/logs/?limit=200", headers=admin).json()["items"]
    actions = {(i["action"], i["actor"], i["target"]) for i in items}
    assert ("user.block", "admin", uid) in actions
    assert ("login.failed", uid, None) in actions
    assert ("user.create", "admin", uid) in actions
    assert "wrong-password" not in str(items) and "pass1234" not in str(items)

    failed = client.get("/api/v1/admin/logs/?failed_only=true", headers=admin).json()["items"]
    assert failed and all(not i["success"] for i in failed)
    assert all(i["request_id"] for i in items)


def test_browser_errors_can_be_reported(client):
    assert client.post("/api/v1/client-logs/", json={"message": "boom", "url": "/x"}).status_code == 204


def test_contact_form(client):
    ok = client.post("/api/v1/contact/", json={"name": "A", "email": "a@b.co", "subject": "Hi", "message": "Hello there friend"})
    assert ok.status_code == 201
    bad = client.post("/api/v1/contact/", json={"name": "A", "email": "nope", "subject": "Hi", "message": "short"})
    assert bad.status_code == 422
