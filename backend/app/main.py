import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import config, seed
from .database import Base, SessionLocal, engine
from .logging_config import request_id_var, setup_logging
from .routers import admin, auth, contact, me, receipts

setup_logging()
log = logging.getLogger("octo")
access_log = logging.getLogger("octo.http")


def create_tables() -> None:
    """Create tables, waiting for the database if it is still starting (docker compose)."""
    for attempt in range(1, 31):
        try:
            Base.metadata.create_all(engine)
            return
        except Exception as exc:  # noqa: BLE001 - any connection problem: retry, then give up loudly
            if attempt == 30:
                log.critical("Database is not reachable, giving up: %s", exc)
                raise
            log.warning("Database not ready (attempt %d/30): %s", attempt, exc.__class__.__name__)
            time.sleep(2)


@asynccontextmanager
async def lifespan(_: FastAPI):
    log.info("Octo starting. database=%s docs=%s", engine.url.render_as_string(hide_password=True), config.ENABLE_DOCS)
    if config.SECRET_KEY.startswith("dev-secret"):
        log.warning("SECRET_KEY is the built-in default. Set a long random SECRET_KEY before real use.")
    create_tables()
    seed.run()
    yield
    log.info("Octo stopping")


app = FastAPI(
    title="Octo API",
    version="2.0.0",
    description="Monthly bill receipts: customers upload proof of payment, the admin tracks who paid and blocks or unblocks accounts.",
    lifespan=lifespan,
    docs_url="/docs" if config.ENABLE_DOCS else None,
    redoc_url="/redoc" if config.ENABLE_DOCS else None,
    openapi_url="/openapi.json" if config.ENABLE_DOCS else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


@app.middleware("http")
async def request_logging(request: Request, call_next):
    """Tag every request with an id, log it with its duration, and turn crashes into a clean 500."""
    rid = request.headers.get("x-request-id", "")[:16] or uuid.uuid4().hex[:8]
    token = request_id_var.set(rid)
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        log.exception("Unhandled error on %s %s", request.method, request.url.path)
        response = JSONResponse({"detail": f"Internal server error (request id {rid})"}, status_code=500)
    ms = (time.perf_counter() - start) * 1000
    path = request.url.path
    if path.startswith("/api/"):
        level = logging.ERROR if response.status_code >= 500 else logging.WARNING if response.status_code >= 400 else logging.INFO
        access_log.log(level, "%s %s -> %d (%.0f ms)", request.method, path, response.status_code, ms)
    response.headers["X-Request-ID"] = rid
    request_id_var.reset(token)
    return response


for module in (auth, me, receipts, admin, contact):
    app.include_router(module.router)


@app.get("/api/health", tags=["meta"])
def health():
    """Liveness + database check (used by the Docker healthcheck)."""
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001
        log.exception("health check: database unreachable")
        return JSONResponse({"status": "error", "database": "down"}, status_code=503)
    return {"status": "ok", "database": "up"}


# ---- serving the exported frontend ---------------------------------------

class SPAStaticFiles(StaticFiles):
    """Static site + one dynamic route: /admin/users/<any user id>/ shows the pre-built placeholder page.

    The frontend is exported to plain files, so a page per user cannot exist ahead of time. Instead
    one page (admin/users/_/) is built, and this class serves it for any user id; the page reads the
    id from the address bar.
    """

    async def get_response(self, path: str, scope):
        try:
            response = await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise
            response = None
        if response is not None and response.status_code != 404:
            return response

        # Starlette hands us an OS-style path (backslashes on Windows).
        parts = [p for p in path.replace("\\", "/").strip("/").split("/") if p]
        if len(parts) == 3 and parts[:2] == ["admin", "users"]:
            return await super().get_response("admin/users/_/index.html", scope)

        not_found = config.STATIC_DIR / "404.html"
        if not_found.is_file():
            return FileResponse(not_found, status_code=404)
        raise StarletteHTTPException(404)


# Must come last: it is a catch-all for everything that is not an API route.
if config.STATIC_DIR.is_dir():
    app.mount("/", SPAStaticFiles(directory=config.STATIC_DIR, html=True), name="frontend")
