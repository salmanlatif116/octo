import os
from pathlib import Path

# Everything the app writes (uploaded receipts, log files, the SQLite file when used) lives under DATA_DIR.
DATA_DIR = Path(os.getenv("DATA_DIR", "./data")).resolve()
UPLOAD_DIR = DATA_DIR / "uploads"
LOG_DIR = Path(os.getenv("LOG_DIR", str(DATA_DIR / "logs"))).resolve()

# PostgreSQL in Docker / production, e.g. postgresql+psycopg://octo:octo@db:5432/octo
# Falls back to a local SQLite file so the backend also runs (and tests) with zero setup.
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{(DATA_DIR / 'octo.db').as_posix()}")

# Change SECRET_KEY in any real deployment; it signs the login tokens.
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me-please-use-a-long-random-value")
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "30"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))

# Folder containing the exported Next.js site. When it exists, FastAPI serves it,
# so one process / one container serves both the UI and the API.
STATIC_DIR = Path(os.getenv("STATIC_DIR", "../frontend/out")).resolve()

# Only needed when the frontend runs on a different origin (npm run dev on :3000).
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]

# The month boundary ("is this month's receipt in?") is computed in this timezone.
APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Karachi")

# Used when the admin does not set a per-user amount.
DEFAULT_MONTHLY_AMOUNT = int(os.getenv("DEFAULT_MONTHLY_AMOUNT", "4500"))
MAX_UPLOAD_BYTES = 5 * 1024 * 1024

# The one admin login, created on first start (change the password!).
ADMIN_USER_ID = os.getenv("ADMIN_USER_ID", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
ADMIN_NAME = os.getenv("ADMIN_NAME", "Administrator")

# Create a handful of demo customers (with receipts) on first start, so there is something to look at.
SEED_DEMO = os.getenv("SEED_DEMO", "false").lower() == "true"

# Swagger UI (/docs) and ReDoc (/redoc). Set false to hide them in production.
ENABLE_DOCS = os.getenv("ENABLE_DOCS", "true").lower() == "true"

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Login throttle: this many wrong passwords for one User ID within the window locks it briefly.
LOGIN_MAX_FAILURES = int(os.getenv("LOGIN_MAX_FAILURES", "5"))
LOGIN_WINDOW_SECONDS = int(os.getenv("LOGIN_WINDOW_SECONDS", "900"))
