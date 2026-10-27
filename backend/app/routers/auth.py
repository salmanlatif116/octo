import logging
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import config
from ..database import get_db
from ..deps import current_user
from ..models import User
from ..schemas import LoginIn, RefreshIn, TokenOut, UserOut
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from ..services import audit, client_ip

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
log = logging.getLogger("octo.auth")

# Failed-login timestamps per (user id, ip). In memory: fine for one server process.
_failures: dict[str, deque[float]] = defaultdict(deque)


def _throttle_key(user_id: str, request: Request) -> str:
    return f"{user_id.lower()}|{client_ip(request)}"


def _is_locked(key: str) -> bool:
    now = time.monotonic()
    q = _failures[key]
    while q and now - q[0] > config.LOGIN_WINDOW_SECONDS:
        q.popleft()
    return len(q) >= config.LOGIN_MAX_FAILURES


def reset_throttle() -> None:
    _failures.clear()


def _tokens(user: User) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id, user.role),
        user=UserOut.model_validate(user),
    )


@router.post("/login/", response_model=TokenOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    user_id = body.user_id.strip()
    key = _throttle_key(user_id, request)

    if _is_locked(key):
        audit(db, request, user_id, "login.locked", detail="too many wrong passwords", success=False)
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Try again in a few minutes.")

    user = db.scalar(select(User).where(User.user_id.ilike(user_id)))
    if not user or not verify_password(body.password, user.password_hash):
        _failures[key].append(time.monotonic())
        audit(db, request, user_id, "login.failed", detail="wrong user id or password", success=False)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong User ID or password")

    _failures.pop(key, None)
    audit(db, request, user.user_id, "login", detail=f"role={user.role}")
    return _tokens(user)


@router.post("/refresh/", response_model=TokenOut)
def refresh(body: RefreshIn, db: Session = Depends(get_db)):
    user_pk = decode_token(body.refresh_token, "refresh")
    user = db.get(User, user_pk) if user_pk else None
    if not user:
        log.info("refresh rejected: invalid or expired refresh token")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    return _tokens(user)


@router.get("/me/", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.post("/logout/", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # Tokens are stateless, so the browser forgets them; this call just leaves a trace in the audit log.
    audit(db, request, user.user_id, "logout")
