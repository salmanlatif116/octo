"""Business rules shared by the routers: months, outstanding amount, receipt files, audit trail."""

import logging
import re
import uuid
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from . import config
from .logging_config import request_id_var
from .models import AuditLog, Receipt, User

log = logging.getLogger("octo.audit")

MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def as_utc(dt: datetime) -> datetime:
    """SQLite hands back naive datetimes; they are always UTC, so label them so the browser converts correctly."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# ---- months ---------------------------------------------------------------

def today() -> date:
    return datetime.now(ZoneInfo(config.APP_TIMEZONE)).date()


def current_month() -> str:
    return today().strftime("%Y-%m")


def month_range(start: str, end: str) -> list[str]:
    """Month keys from start to end inclusive, oldest first."""
    y, m = map(int, start.split("-"))
    ey, em = map(int, end.split("-"))
    out: list[str] = []
    while (y, m) <= (ey, em):
        out.append(f"{y}-{m:02d}")
        m += 1
        if m > 12:
            y, m = y + 1, 1
    return out


def check_month(month: str) -> str:
    if not MONTH_RE.match(month):
        raise HTTPException(422, "Month must look like 2026-10")
    return month


def paid_months(user: User) -> set[str]:
    return {r.month for r in user.receipts}


def unpaid_months(user: User) -> list[str]:
    """Months from the user's start month up to now with no receipt, oldest first."""
    paid = paid_months(user)
    return [m for m in month_range(user.start_month, current_month()) if m not in paid]


# ---- receipt files --------------------------------------------------------

# Magic bytes, so a renamed .exe cannot be uploaded as a "receipt".
_SIGNATURES: list[tuple[bytes, str, str]] = [
    (b"\xff\xd8\xff", "image/jpeg", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", "png"),
    (b"GIF8", "image/gif", "gif"),
]


def sniff_image(data: bytes) -> tuple[str, str] | None:
    for magic, content_type, ext in _SIGNATURES:
        if data.startswith(magic):
            return content_type, ext
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", "webp"
    return None


async def read_upload(file: UploadFile) -> tuple[bytes, str, str]:
    data = await file.read(config.MAX_UPLOAD_BYTES + 1)
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image is larger than 5 MB")
    if not data:
        raise HTTPException(422, "The file is empty")
    kind = sniff_image(data)
    if not kind:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a JPG, PNG, WEBP or GIF image")
    return data, kind[0], kind[1]


def save_file(user: User, month: str, data: bytes, ext: str) -> str:
    """Write the file under UPLOAD_DIR/<user pk>/ and return the path relative to UPLOAD_DIR."""
    rel = f"{user.id}/{month}-{uuid.uuid4().hex[:8]}.{ext}"
    path = config.UPLOAD_DIR / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return rel


def delete_file(rel: str) -> None:
    try:
        (config.UPLOAD_DIR / rel).unlink(missing_ok=True)
    except OSError:
        log.warning("Could not delete receipt file %s", rel)


def generated_receipt_svg(user: User, receipt_month: str, amount: int, method: str, reference: str) -> bytes:
    """A simple receipt picture for the simulated JazzCash / card payments (there is no screenshot to store)."""
    via = "JazzCash" if method == "jazzcash" else "Bank card"
    esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")  # noqa: E731
    paid_at = datetime.now(ZoneInfo(config.APP_TIMEZONE)).strftime("%d %b %Y, %H:%M")
    rows = [("Paid by", user.name), ("User ID", user.user_id), ("For month", receipt_month), ("Via", f"{via} {reference}"), ("Paid on", paid_at)]
    body = "".join(
        f'<text x="24" y="{108 + i * 52}" font-family="Arial" font-size="13" fill="#64748b">{label}</text>'
        f'<text x="24" y="{130 + i * 52}" font-family="Arial" font-size="18" font-weight="bold" fill="#083174">{esc(value)}</text>'
        for i, (label, value) in enumerate(rows)
    )
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">'
        '<rect width="360" height="480" fill="#fff"/><rect width="360" height="64" fill="#083174"/>'
        '<text x="24" y="40" font-family="Arial" font-size="22" font-weight="bold" fill="#fff">Payment Receipt</text>'
        f"{body}"
        f'<text x="24" y="410" font-family="Arial" font-size="30" font-weight="bold" fill="#16a34a">Rs {amount:,}</text>'
        '<text x="24" y="450" font-family="Arial" font-size="14" fill="#16a34a">Transaction successful</text></svg>'
    )
    return svg.encode()


# ---- audit trail ----------------------------------------------------------

def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()[:45]
    return request.client.host if request.client else None


def audit(
    db: Session,
    request: Request | None,
    actor: str,
    action: str,
    target: str | None = None,
    detail: str | None = None,
    success: bool = True,
) -> None:
    """Record a business event in the audit table AND the log file. Never put passwords or tokens in `detail`."""
    db.add(
        AuditLog(
            actor=actor,
            action=action,
            target=target,
            detail=detail,
            ip=client_ip(request),
            request_id=request_id_var.get()[:16],
            success=1 if success else 0,
        )
    )
    db.commit()
    level = logging.INFO if success else logging.WARNING
    log.log(level, "%s actor=%s target=%s success=%s %s", action, actor, target, success, detail or "")


def receipt_exists(db: Session, user: User, month: str) -> Receipt | None:
    return next((r for r in user.receipts if r.month == month), None)
