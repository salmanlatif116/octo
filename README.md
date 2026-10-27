# Octo — monthly bill receipts

Octo is a small portal for a business that bills its customers every month.

- A **customer** logs in with the **User ID and password** the admin gave them. They see their name, ID, an **Active / Inactive** status and what they owe. They pay (JazzCash or bank card, simulated) or **upload a payment receipt**, and can review their receipts under **Transactions**.
- The **admin** sees every customer and every month's receipts. A customer who did not pay can be **blocked** (status `1`, shown as Inactive). After they pay, the admin **unblocks** them (status `0`, shown as Active). An **Activity** screen shows who did what.

It is one repository and one `docker compose up`: a **PostgreSQL** database plus one app container where a **FastAPI** backend serves both the REST API and the **Next.js** frontend (built to static files). No CORS or tunnel setup.

> **Payments are simulated.** JazzCash and bank-card payments validate the details and record a receipt, but no payment gateway is called and no money moves. Card numbers are never stored (only the last 4 digits) and the CVV never leaves the browser.

---

## Contents

1. [Quick start (for the client / anyone pulling the code)](#1-quick-start)
2. [Try the app](#2-try-the-app)
3. [How the system works](#3-how-the-system-works)
4. [The API (FastAPI docs)](#4-the-api)
5. [Logs: finding problems](#5-logs)
6. [Testing](#6-testing)
7. [Run without Docker (development)](#7-run-without-docker-development)
8. [Configuration](#8-configuration)
9. [Operations: backup, reset, update](#9-operations)
10. [Troubleshooting](#10-troubleshooting)
11. [Known limits](#11-known-limits)

---

## 1. Quick start

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose). Nothing else.

```bash
git clone <this-repo-url>
cd octo
cp .env.example .env        # optional: edit passwords / secret (see section 8)
docker compose up --build
```

Wait for `Application startup complete`, then open **http://localhost:8000**.

(PowerShell: `Copy-Item .env.example .env`. Port 8000 busy? Set `APP_PORT=9000` in `.env`.)

| Command | What it does |
|---|---|
| `docker compose up --build -d` | Build and run in the background |
| `docker compose logs -f octo` | Follow the app logs |
| `docker compose down` | Stop (data is kept) |
| `docker compose down -v` | Stop **and delete** the database, receipts and logs |
| `git pull && docker compose up --build -d` | Update to the newest code |

On the first start the app creates the tables, the **admin** account, and (when `SEED_DEMO=true`, the default) 8 demo customers with receipts.

## 2. Try the app

| Who | User ID | Password | What you see |
|---|---|---|---|
| Admin | `admin` | `admin123` | Admin area: Users, Receipts, Activity |
| Customer, **owes this month** | `S10500008` | `demo123` | Inactive, Rs 4,500 outstanding, can pay or upload |
| Customer, all paid | `S10500001` | `user123` | Active, Rs 0 outstanding |
| Customer, **blocked** | `S10500003` | `user123` | Inactive, "blocked" banner |
| Customer, blocked, 2 months unpaid | `S10500005` | `user123` | Inactive, Rs 9,000 outstanding |

(Change the admin password in `.env` before showing this to anyone outside your team. Other demo customers: `S10500002`, `S10500004`, `S10500006`, `S10500007`, all with `user123`.)

**A good 5-minute demo for the client**

1. Log in as `S10500008`. Show *Inactive* and *Rs 4,500 outstanding*. Pay with JazzCash (`03001234567`) or upload any image. Outstanding becomes Rs 0 and the receipt appears under **Transactions**.
2. Log out (a confirmation popup appears) and log in as `admin`. On **Users**, pick the month and see who has and has not uploaded. Click **Details** on a customer for their month-by-month history; click **View** to open a receipt.
3. On **Users** (or **Receipts → Not uploaded**) click **Block** on a customer who did not pay → status becomes `1`. Log in as that customer: *Inactive*, "blocked" banner.
4. Let that customer pay, then as admin click **Unblock** → status `0`, the customer is *Active* again.
5. Open **Activity** to show every login, upload and block/unblock with who did it, and open **http://localhost:8000/docs** to show the API (section 4).

Handy test values for the simulated payments:

| Where | Value | Result |
|---|---|---|
| JazzCash number | `03001234567` | Accepted (11 digits, starts with `03`) |
| JazzCash number | `12345678901` or fewer than 11 digits | Rejected |
| Card number | `4242 4242 4242 4242` | Accepted (any 16 digits) |
| Card expiry | `12/45` accepted, `01/20` rejected (expired) | |
| CVV | `123` | Accepted (checked in the browser only) |

## 3. How the system works

```
 Browser (Next.js + React + Zustand)
    │  POST /api/v1/auth/login   {user_id, password}
    ▼
 FastAPI ──checks password (bcrypt)──► PostgreSQL
    │  returns access token (30 min) + refresh token (7 days) + role
    ▼
 Browser keeps them in the Zustand auth store (saved in localStorage)
    │  every request:  Authorization: Bearer <access token>
    ▼
 FastAPI verifies the token, loads the user, checks the role
    → 200 OK / 401 not logged in / 403 wrong role
```

| Piece | Role |
|---|---|
| **PostgreSQL** | The database: users, receipts, activity log. Runs as its own container with its own volume. |
| **FastAPI + Uvicorn** | The backend: validates requests (Pydantic), enforces roles, talks to the database, stores receipt files, writes logs, serves the built frontend. |
| **SQLAlchemy** | Python ↔ database layer (no hand-written SQL). Tables are created on start. |
| **bcrypt** | Passwords are stored only as one-way hashes. |
| **JWT (PyJWT)** | The login tokens. The role is always re-read from the database, never trusted from the token alone. |
| **Next.js + React** | The UI, exported to static files. |
| **Zustand** | `authStore` holds the tokens and logged-in user (`frontend/src/store/authStore.ts`). |
| **Docker Compose** | Starts PostgreSQL and the app together. |

**Authentication.** Login uses User ID (case-insensitive) + password. The frontend (`frontend/src/lib/api.ts`) attaches the access token to every request; when it expires the frontend quietly trades the refresh token for a new one and retries once, and logs the user out if that fails. Five wrong passwords for one User ID from one address lock further attempts for 15 minutes.

**Roles.** `user` (customer) sees only their own data. `admin` sees everyone and manages them. Customer screens live under `/`, admin screens under `/admin/`; each area redirects the wrong role, and the API refuses it with 403 regardless of the screens.

**Status.** `status = 1` means blocked, `0` means unblocked. *Only an admin changes it* — paying does not unblock anyone automatically. The customer sees **Active** only when status is `0` **and** nothing is outstanding.

**Outstanding.** Each customer has their own monthly amount and a start month. Every month from the start month up to now without a receipt is "unpaid". Paying or uploading covers the oldest unpaid month. The month rolls over at midnight in `APP_TIMEZONE` (default Asia/Karachi).

**Receipt files.** Saved on disk under `/data/uploads/<user>/` (volume `octo-data`); the database stores only the path. They are never served as public files: `GET /api/v1/receipts/{id}/file/` requires login and only the owner or an admin gets it. Uploads must be a real JPG/PNG/WEBP/GIF (checked by content, not file name) up to 5 MB.

**Dynamic route.** The site is exported to plain files, so a page per customer cannot be pre-built. Instead one page (`/admin/users/_/`) is built and the backend serves it for **any** `/admin/users/<user id>/`; the page reads the id from the address. So `/admin/users/S10500003/` is a real, bookmarkable, refreshable URL (`SPAStaticFiles` in `backend/app/main.py`).

### Project structure

```
backend/
  app/
    main.py            app setup, request logging middleware, serves the frontend
    config.py          every setting (environment variables)
    models.py          tables: users, receipts, audit_log, contact_messages
    schemas.py         request / response shapes (Pydantic)
    security.py        password hashing + tokens
    deps.py            "who is logged in" and role checks
    services.py        month maths, outstanding, receipt files, audit helper
    logging_config.py  log files + request ids
    seed.py            admin + demo data on first start
    routers/           auth.py  me.py  admin.py  receipts.py  contact.py
  tests/               pytest suite
frontend/src/
  app/                 pages: login, (app)/ customer, admin/ admin
  components/          screens and shared UI
  lib/api.ts           API client: tokens, refresh, typed endpoints
  store/authStore.ts   Zustand auth store
e2e/                   browser smoke test
Dockerfile  docker-compose.yml  .env.example
```

## 4. The API

FastAPI documents itself. With the app running:

| URL | What |
|---|---|
| http://localhost:8000/docs | **Swagger UI**: every endpoint, try them live |
| http://localhost:8000/redoc | Read-only reference |
| http://localhost:8000/openapi.json | Machine-readable spec (import into Postman) |
| http://localhost:8000/api/health | Liveness + database check |

**Trying protected endpoints in Swagger:** run `POST /api/v1/auth/login/` with `{"user_id": "admin", "password": "admin123"}`, copy the `access_token` from the response, click **Authorize** (top right), paste it, and every endpoint now works. Use a customer login to see the customer endpoints (and 403 on admin ones).

From the command line:

```bash
TOKEN=$(curl -s -X POST localhost:8000/api/v1/auth/login/ -H 'content-type: application/json' \
  -d '{"user_id":"admin","password":"admin123"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s localhost:8000/api/v1/admin/users/ -H "Authorization: Bearer $TOKEN"
```

| Endpoint | Who | What |
|---|---|---|
| `POST /api/v1/auth/login/` · `/refresh/` · `/logout/` · `GET /auth/me/` | all | Sign in, renew the token, sign out (audit entry), current user |
| `GET /api/v1/me/summary/` | customer | ID, name, status, active?, monthly amount, unpaid months, outstanding |
| `GET /api/v1/me/receipts/` | customer | Own receipts |
| `POST /api/v1/me/receipts/` | customer | Upload a receipt image (multipart `file`) |
| `POST /api/v1/me/pay/` | customer | **Simulated** JazzCash / card payment → receipt |
| `GET /api/v1/receipts/{id}/file/` | owner or admin | The receipt image |
| `GET /api/v1/admin/months/` | admin | Months for the pickers |
| `GET /api/v1/admin/users/?month=YYYY-MM` | admin | Customers + whether each uploaded that month |
| `POST /api/v1/admin/users/` | admin | Create a customer (User ID, name, password, monthly amount) |
| `GET /api/v1/admin/users/{user_id}/` | admin | One customer with month-by-month history |
| `PATCH /api/v1/admin/users/{user_id}/` | admin | Change name / monthly amount |
| `PATCH /api/v1/admin/users/{user_id}/status/` | admin | **Block (`1`) / unblock (`0`)** |
| `PUT /api/v1/admin/users/{user_id}/password/` | admin | Reset a customer's password |
| `GET /api/v1/admin/receipts/?month=YYYY-MM` | admin | All receipts that month + who is missing |
| `GET /api/v1/admin/logs/` | admin | Activity log (`q`, `failed_only`, `limit`, `offset`) |
| `POST /api/v1/contact/` · `/client-logs/` | public | Contact form · browser error reports |

Errors are JSON `{"detail": "..."}` with a normal status code (401 not logged in, 403 wrong role, 404, 409 conflict, 422 invalid input, 429 too many logins). Every response carries an `X-Request-ID` header (see logs below). Set `ENABLE_DOCS=false` to hide `/docs`, `/redoc` and `/openapi.json` in production.

## 5. Logs

There are three places to look, from "quickest" to "most detail":

**1. The Activity screen (admin → Activity)** — the business log, for the client. Every login (and failed login), logout, receipt upload, block/unblock, password reset and user creation, with time, who, target, IP and request id. Filter with "Failed only" or search by user / action / request id.

**2. Live app log** — for you when something breaks:

```bash
docker compose logs -f octo          # follow live
docker compose logs --since 10m octo # last 10 minutes
```

Every API call is one line with its duration; errors include the full stack trace:

```
2026-10-27 18:18:34 INFO    [2c48e946] octo.audit: receipt.upload actor=S10500008 target=2026-10 success=True method=jazzcash amount=4500
2026-10-27 18:18:34 INFO    [2c48e946] octo.http: POST /api/v1/me/pay/ -> 201 (62 ms)
2026-10-27 18:18:31 WARNING [869e480e] octo.http: POST /api/v1/auth/login/ -> 401 (839 ms)
```

The id in brackets is the **request id**: all lines from one action share it. When a user reports an error, the browser also receives it (`X-Request-ID`, and 500 errors say "request id …"), so you can find everything that happened with `docker compose logs octo | grep 2c48e946`.

**3. Log files** — kept on the `octo-data` volume, rotated at 5 MB (5 old files kept):

```bash
docker compose exec octo tail -f /data/logs/app.log     # everything
docker compose exec octo tail -f /data/logs/error.log   # warnings and errors only: start here
```

Browser crashes are reported to the same log (logger `octo.client`). Passwords, tokens and card data are never logged. Change verbosity with `LOG_LEVEL` (`DEBUG`, `INFO`, `WARNING`, `ERROR`).

Database check, any time:

```bash
docker compose exec db psql -U octo -d octo -c "select * from audit_log order by id desc limit 20;"
docker compose exec db psql -U octo -d octo -c "select user_id, status, monthly_amount from users;"
```

## 6. Testing

### 6.1 Automated backend tests

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q
```

22 tests, each run against a throwaway SQLite database. They cover: login and wrong password, login lockout, token refresh (an access token cannot refresh), 401 without a token, customers refused on admin endpoints (403), upload validation (fake image refused), simulated payments, the **block / pay / unblock rules**, private receipt files (other customers get 404), duplicate User IDs, password reset, and that the activity log records actions but never passwords.

### 6.2 Type-check and build the frontend

```bash
cd frontend
npm install
npm run typecheck
npm run build        # creates frontend/out
```

### 6.3 Browser smoke test (whole app, ~20 checks)

Drives the real UI as customer and admin: wrong password, pay a bill, receipt thumbnails, admin tables, block, the dynamic `/admin/users/<id>/` URL (also on refresh), Activity log, logout popup, role redirects, and that there are no browser errors. It needs a **fresh** database with demo data (it pays a bill and blocks a user), so start clean:

```bash
docker compose down -v && docker compose up --build -d     # fresh DB + demo data
cd e2e
npm install
# uses an installed Chrome; for Edge: BROWSER_CHANNEL=msedge, or set BROWSER_PATH to any browser
BASE=http://localhost:8000 npm run smoke
```

### 6.4 Manual checklist

- Wrong password → "Wrong User ID or password". 5 wrong in a row → "Too many attempts".
- Customer `S10500008`: Inactive + Rs 4,500 → pay → Active + Rs 0, receipt in Transactions.
- Customer tries `/admin/` → sent back to the customer home. Logged-out visitor → login page.
- Admin blocks a customer → customer shows Inactive with the blocked banner; paying alone does **not** unblock; admin unblocks → Active.
- Admin creates a customer (monthly amount 6000) → that customer can log in and owes Rs 6,000.
- Upload a `.txt` renamed to `.png` → rejected. Upload over 5 MB → rejected.
- Open `/admin/users/S10500001/` directly and press refresh → still works.
- Stop the database (`docker compose stop db`) → `/api/health` returns 503 and the log shows why; `docker compose start db` → recovers.

## 7. Run without Docker (development)

Use this for hot reload. You need **Python 3.11+** and **Node.js 20+**. Without a `DATABASE_URL` the backend uses a local SQLite file (`backend/data/octo.db`), so no PostgreSQL is needed.

**Terminal 1 — backend (port 8000)**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
# macOS/Linux:
SEED_DEMO=true uvicorn app.main:app --reload --port 8000
# PowerShell:  $env:SEED_DEMO="true"; uvicorn app.main:app --reload --port 8000
```

To develop against PostgreSQL instead, start only the database (`docker compose up -d db`, after adding `ports: ["5432:5432"]` to the `db` service) and set `DATABASE_URL=postgresql+psycopg://octo:octo-dev-password@localhost:5432/octo`.

**Terminal 2 — frontend (port 3000)**

```bash
cd frontend
cp .env.example .env.local      # points the UI at http://localhost:8000
npm install
npm run dev
```

Open **http://localhost:3000**. The backend allows that origin through CORS. (If port 3000 is taken, Next picks another port; add it to `CORS_ORIGINS`.)

**Production-style build without Docker** (one process, like the container):

```bash
cd frontend && npm install && NEXT_PUBLIC_API_BASE_URL= npm run build   # creates frontend/out
cd ../backend && uvicorn app.main:app --port 8000                       # serves API + frontend/out
```

## 8. Configuration

Set these in `.env` (copied from `.env.example`) for Docker, or as environment variables otherwise.

| Variable | Default | Meaning |
|---|---|---|
| `APP_PORT` | `8000` | Port on your machine |
| `SECRET_KEY` | dev value | Signs login tokens. **Set a long random value.** A warning is logged while it is the default. |
| `POSTGRES_PASSWORD` | `octo-dev-password` | Database password (Docker) |
| `ADMIN_USER_ID` / `ADMIN_PASSWORD` / `ADMIN_NAME` | `admin` / `admin123` / `Administrator` | The admin, created on first start only. Changing them later does not change an existing admin. |
| `DEFAULT_MONTHLY_AMOUNT` | `4500` | Amount for a new customer when none is entered |
| `SEED_DEMO` | `true` in Docker, `false` otherwise | Create 8 demo customers on first start. **Use `false` for real data.** |
| `ENABLE_DOCS` | `true` | Show `/docs`, `/redoc`, `/openapi.json` |
| `LOG_LEVEL` | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `APP_TIMEZONE` | `Asia/Karachi` | Where "this month" starts and ends |
| `DATABASE_URL` | PostgreSQL in Docker, SQLite file otherwise | SQLAlchemy URL |
| `ACCESS_TOKEN_MINUTES` / `REFRESH_TOKEN_DAYS` | `30` / `7` | Token lifetimes |
| `LOGIN_MAX_FAILURES` / `LOGIN_WINDOW_SECONDS` | `5` / `900` | Login lockout |
| `CORS_ORIGINS` | `http://localhost:3000` | Only needed when the UI runs on another origin (`npm run dev`) |

## 9. Operations

**Back up** (database + receipts):

```bash
docker compose exec -T db pg_dump -U octo octo > octo-backup.sql
docker run --rm -v octo_octo-data:/data -v "$PWD":/backup alpine tar czf /backup/octo-receipts.tgz /data/uploads
```

**Restore the database:** `docker compose exec -T db psql -U octo octo < octo-backup.sql`

**Start over from scratch:** `docker compose down -v && docker compose up --build`

**Go live checklist:** set `SECRET_KEY`, `ADMIN_PASSWORD` and `POSTGRES_PASSWORD`; set `SEED_DEMO=false`; consider `ENABLE_DOCS=false`; put the app behind HTTPS (a reverse proxy such as Caddy or nginx); schedule the backups above.

## 10. Troubleshooting

| Problem | What to do |
|---|---|
| `port is already allocated` | Another program uses 8000. Set `APP_PORT=9000` in `.env`. |
| App container keeps restarting | `docker compose logs octo` — usually the database was not ready (it retries for a minute) or a bad setting. |
| `/api/health` says `database: down` | `docker compose ps` — is `octo-db` healthy? `docker compose logs db`. |
| "Cannot reach the server" in the UI | The backend is not running, or (dev mode) the frontend port is missing from `CORS_ORIGINS`. |
| Logged out unexpectedly | The refresh token expired (7 days) or `SECRET_KEY` changed. Log in again. |
| "Too many attempts" at login | Wait 15 minutes, or restart the app (the counter is in memory). |
| A customer says a page shows an error | Ask for the time and User ID, then search **Activity** or `docker compose logs octo`. |
| Changed `ADMIN_PASSWORD` but the old one still works | It only applies when the admin is first created. Use `docker compose down -v` for a fresh start, or reset it in the database. |

## 11. Known limits

- Tables are created automatically but there are **no migrations** yet. Before changing the data model on a live system, add Alembic.
- Login lockout and tokens are per server process; run one app container (as in the compose file) or add a shared store.
- Tokens cannot be revoked before they expire (30 min for access tokens); blocking a customer changes their status immediately, not their ability to log in (blocked customers can still sign in, by design, to see why they are inactive).
- The admin list endpoints are not paginated (fine for hundreds of customers; the Activity log is paginated).
- Payments are simulated; a real gateway would be a separate integration.
