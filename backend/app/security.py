from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from . import config


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def _token(user_pk: int, role: str, kind: str, lifetime: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_pk), "role": role, "type": kind, "iat": now, "exp": now + lifetime}
    return jwt.encode(payload, config.SECRET_KEY, algorithm="HS256")


def create_access_token(user_pk: int, role: str) -> str:
    return _token(user_pk, role, "access", timedelta(minutes=config.ACCESS_TOKEN_MINUTES))


def create_refresh_token(user_pk: int, role: str) -> str:
    return _token(user_pk, role, "refresh", timedelta(days=config.REFRESH_TOKEN_DAYS))


def decode_token(token: str, kind: str) -> int | None:
    """Return the user's primary key if the token is valid and of the expected kind, else None."""
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != kind:
        return None
    try:
        return int(payload["sub"])
    except (KeyError, ValueError):
        return None
