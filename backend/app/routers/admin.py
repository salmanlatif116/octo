"""Admin-only endpoints: users, monthly receipts, block / unblock, activity log."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .. import config
from ..database import get_db
from ..deps import require_admin
from ..models import AuditLog, Receipt, User
from ..schemas import (
    AdminReceiptsOut,
    AdminUserDetail,
    AdminUserRow,
    CreateUserIn,
    LogOut,
    LogsPage,
    MonthRow,
    PasswordIn,
    ReceiptBrief,
    StatusIn,
    UpdateUserIn,
)
from ..security import hash_password
from ..services import as_utc, audit, check_month, current_month, month_range, unpaid_months
from .me import receipt_out

router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_admin)])
log = logging.getLogger("octo.admin")


def _customer(db: Session, user_id: str) -> User:
    user = db.scalar(select(User).where(User.user_id == user_id, User.role == "user").options(selectinload(User.receipts)))
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


def _row(user: User, month: str) -> AdminUserRow:
    receipt = next((r for r in user.receipts if r.month == month), None)
    return AdminUserRow(
        user_id=user.user_id,
        name=user.name,
        status=user.status,
        monthly_amount=user.monthly_amount,
        start_month=user.start_month,
        owes=user.start_month <= month,
        receipt=ReceiptBrief(id=receipt.id, uploaded_at=as_utc(receipt.uploaded_at), method=receipt.method) if receipt else None,
    )


@router.get("/months/", response_model=list[str])
def months(db: Session = Depends(get_db)):
    """Every month from the earliest customer up to now, newest first (for the month pickers)."""
    earliest = db.scalar(select(func.min(User.start_month)).where(User.role == "user")) or current_month()
    return list(reversed(month_range(min(earliest, current_month()), current_month())))


@router.get("/users/", response_model=list[AdminUserRow])
def list_users(month: str | None = None, q: str | None = None, db: Session = Depends(get_db)):
    month = check_month(month) if month else current_month()
    stmt = select(User).where(User.role == "user").options(selectinload(User.receipts)).order_by(User.user_id)
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.user_id.ilike(like), User.name.ilike(like)))
    return [_row(u, month) for u in db.scalars(stmt)]


@router.post("/users/", response_model=AdminUserRow, status_code=status.HTTP_201_CREATED)
def create_user(body: CreateUserIn, request: Request, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.scalar(select(User.id).where(func.lower(User.user_id) == body.user_id.lower())):
        audit(db, request, admin.user_id, "user.create", target=body.user_id, detail="User ID already taken", success=False)
        raise HTTPException(status.HTTP_409_CONFLICT, "That User ID is already taken")
    user = User(
        user_id=body.user_id,
        name=body.name.strip(),
        password_hash=hash_password(body.password),
        role="user",
        status=0,
        monthly_amount=body.monthly_amount or config.DEFAULT_MONTHLY_AMOUNT,
        start_month=current_month(),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        audit(db, request, admin.user_id, "user.create", target=body.user_id, detail="User ID already taken", success=False)
        raise HTTPException(status.HTTP_409_CONFLICT, "That User ID is already taken")
    user.receipts = []
    audit(db, request, admin.user_id, "user.create", target=user.user_id, detail=f"monthly_amount={user.monthly_amount}")
    return _row(user, current_month())


@router.get("/users/{user_id}/", response_model=AdminUserDetail)
def user_detail(user_id: str, db: Session = Depends(get_db)):
    user = _customer(db, user_id)
    by_month = {r.month: r for r in user.receipts}
    rows = []
    for m in reversed(month_range(user.start_month, current_month())):
        r = by_month.get(m)
        if r:
            r.user = user
        rows.append(MonthRow(month=m, receipt=receipt_out(r, with_user=True) if r else None))
    unpaid = unpaid_months(user)
    return AdminUserDetail(
        user_id=user.user_id,
        name=user.name,
        status=user.status,
        monthly_amount=user.monthly_amount,
        start_month=user.start_month,
        unpaid_count=len(unpaid),
        outstanding_amount=len(unpaid) * user.monthly_amount,
        months=rows,
    )


@router.patch("/users/{user_id}/", response_model=AdminUserRow)
def update_user(user_id: str, body: UpdateUserIn, request: Request, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = _customer(db, user_id)
    changes = []
    if body.name is not None and body.name.strip() != user.name:
        changes.append(f"name {user.name!r} -> {body.name.strip()!r}")
        user.name = body.name.strip()
    if body.monthly_amount is not None and body.monthly_amount != user.monthly_amount:
        changes.append(f"monthly_amount {user.monthly_amount} -> {body.monthly_amount}")
        user.monthly_amount = body.monthly_amount
    db.commit()
    if changes:
        audit(db, request, admin.user_id, "user.update", target=user.user_id, detail="; ".join(changes))
    return _row(user, current_month())


@router.patch("/users/{user_id}/status/", response_model=AdminUserRow)
def set_status(user_id: str, body: StatusIn, request: Request, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Block (status 1) or unblock (status 0) a customer."""
    user = _customer(db, user_id)
    if user.status != body.status:
        user.status = body.status
        db.commit()
    audit(db, request, admin.user_id, "user.block" if body.status else "user.unblock", target=user.user_id, detail=f"status={body.status}")
    return _row(user, current_month())


@router.put("/users/{user_id}/password/", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(user_id: str, body: PasswordIn, request: Request, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = _customer(db, user_id)
    user.password_hash = hash_password(body.password)
    db.commit()
    audit(db, request, admin.user_id, "user.password_reset", target=user.user_id)


@router.get("/receipts/", response_model=AdminReceiptsOut)
def receipts_for_month(month: str | None = None, q: str | None = None, db: Session = Depends(get_db)):
    """Everything uploaded for a month, plus the customers who have not uploaded yet."""
    month = check_month(month) if month else current_month()
    users = list(db.scalars(select(User).where(User.role == "user").options(selectinload(User.receipts)).order_by(User.user_id)))
    term = (q or "").strip().lower()
    users = [u for u in users if not term or term in u.user_id.lower() or term in u.name.lower()]

    uploaded: list[Receipt] = []
    missing: list[AdminUserRow] = []
    for u in users:
        r = next((x for x in u.receipts if x.month == month), None)
        if r:
            r.user = u
            uploaded.append(r)
        elif u.start_month <= month:
            missing.append(_row(u, month))
    uploaded.sort(key=lambda r: as_utc(r.uploaded_at), reverse=True)
    return AdminReceiptsOut(month=month, receipts=[receipt_out(r, with_user=True) for r in uploaded], missing=missing)


@router.get("/logs/", response_model=LogsPage)
def activity_log(
    q: str | None = None,
    action: str | None = None,
    failed_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(AuditLog)
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(AuditLog.actor.ilike(like), AuditLog.target.ilike(like), AuditLog.detail.ilike(like), AuditLog.request_id.ilike(like)))
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if failed_only:
        stmt = stmt.where(AuditLog.success == 0)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(AuditLog.id.desc()).limit(limit).offset(offset))
    items = [
        LogOut(
            id=r.id,
            created_at=as_utc(r.created_at),
            actor=r.actor,
            action=r.action,
            target=r.target,
            detail=r.detail,
            ip=r.ip,
            request_id=r.request_id,
            success=bool(r.success),
        )
        for r in rows
    ]
    return LogsPage(total=total, items=items)
