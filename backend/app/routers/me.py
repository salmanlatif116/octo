"""Endpoints for the logged-in customer."""

import logging
import re
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_user
from ..models import Receipt, User, utcnow
from ..schemas import PayIn, ReceiptOut, SummaryOut
from ..services import (
    as_utc,
    audit,
    check_month,
    delete_file,
    generated_receipt_svg,
    read_upload,
    receipt_exists,
    save_file,
    unpaid_months,
)

router = APIRouter(prefix="/api/v1/me", tags=["customer"])
log = logging.getLogger("octo.me")


def receipt_out(r: Receipt, with_user: bool = False) -> ReceiptOut:
    return ReceiptOut(
        id=r.id,
        month=r.month,
        amount=r.amount,
        method=r.method,
        reference=r.reference,
        uploaded_at=as_utc(r.uploaded_at),
        user_id=r.user.user_id if with_user else None,
        user_name=r.user.name if with_user else None,
    )


def _store_receipt(
    db: Session,
    request: Request,
    user: User,
    month: str,
    *,
    data: bytes,
    content_type: str,
    ext: str,
    method: str | None,
    reference: str | None,
) -> Receipt:
    """Create (or replace) the receipt for `month`."""
    rel = save_file(user, month, data, ext)
    existing = receipt_exists(db, user, month)
    old_file = None
    if existing:
        old_file = existing.file_path
        existing.amount = user.monthly_amount
        existing.method = method
        existing.reference = reference
        existing.file_path = rel
        existing.content_type = content_type
        existing.uploaded_at = utcnow()
        receipt = existing
    else:
        receipt = Receipt(
            user_pk=user.id,
            month=month,
            amount=user.monthly_amount,
            method=method,
            reference=reference,
            file_path=rel,
            content_type=content_type,
        )
        db.add(receipt)
    try:
        db.commit()
    except IntegrityError:  # two uploads for the same month raced each other
        db.rollback()
        delete_file(rel)
        raise HTTPException(status.HTTP_409_CONFLICT, "A receipt for this month was just uploaded")
    if old_file:
        delete_file(old_file)
    receipt.user = user
    audit(
        db,
        request,
        user.user_id,
        "receipt.replace" if existing else "receipt.upload",
        target=month,
        detail=f"method={method or 'screenshot'} amount={receipt.amount}",
    )
    return receipt


@router.get("/summary/", response_model=SummaryOut)
def summary(user: User = Depends(require_user)):
    unpaid = unpaid_months(user)
    return SummaryOut(
        user_id=user.user_id,
        name=user.name,
        status=user.status,
        active=user.status == 0 and not unpaid,
        monthly_amount=user.monthly_amount,
        unpaid_months=unpaid,
        outstanding_amount=len(unpaid) * user.monthly_amount,
    )


@router.get("/receipts/", response_model=list[ReceiptOut])
def my_receipts(user: User = Depends(require_user)):
    return [receipt_out(r) for r in sorted(user.receipts, key=lambda r: r.uploaded_at, reverse=True)]


@router.post("/receipts/", response_model=ReceiptOut, status_code=status.HTTP_201_CREATED)
async def upload_receipt(
    request: Request,
    file: UploadFile = File(...),
    month: str | None = Form(default=None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Upload a payment screenshot. Without `month` it pays the oldest unpaid month."""
    unpaid = unpaid_months(user)
    if month is not None:
        check_month(month)
        if month not in unpaid and not receipt_exists(db, user, month):
            raise HTTPException(422, "You do not owe that month")
    elif unpaid:
        month = unpaid[0]
    else:
        raise HTTPException(status.HTTP_409_CONFLICT, "Nothing is due right now")

    data, content_type, ext = await read_upload(file)
    receipt = _store_receipt(db, request, user, month, data=data, content_type=content_type, ext=ext, method=None, reference=None)
    return receipt_out(receipt)


@router.post("/pay/", response_model=ReceiptOut, status_code=status.HTTP_201_CREATED)
def pay(body: PayIn, request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    """SIMULATED payment: validates the details and records a receipt. No gateway is called, no money moves."""
    unpaid = unpaid_months(user)
    if not unpaid:
        raise HTTPException(status.HTTP_409_CONFLICT, "Nothing is due right now")

    if body.method == "jazzcash":
        number = body.account_number or ""
        if len(number) != 11 or not number.startswith("03"):
            raise HTTPException(422, "Enter an 11-digit JazzCash number starting with 03")
        reference = f"{number[:2]}••••••{number[-3:]}"
    else:
        card = body.card_number or ""
        match = re.fullmatch(r"(\d{2})/(\d{2})", body.card_expiry or "")
        if len(card) != 16:
            raise HTTPException(422, "Enter a valid 16-digit card number")
        if not match or not 1 <= int(match.group(1)) <= 12:
            raise HTTPException(422, "Enter the expiry as MM/YY")
        now = datetime.now()
        if (2000 + int(match.group(2)), int(match.group(1))) < (now.year, now.month):
            raise HTTPException(422, "This card has expired")
        reference = f"•••• {card[-4:]}"

    month = unpaid[0]
    svg = generated_receipt_svg(user, month, user.monthly_amount, body.method, reference)
    receipt = _store_receipt(
        db, request, user, month, data=svg, content_type="image/svg+xml", ext="svg", method=body.method, reference=reference
    )
    return receipt_out(receipt)
