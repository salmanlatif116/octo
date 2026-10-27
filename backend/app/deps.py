from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import decode_token

bearer = HTTPBearer(auto_error=False)


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    user_pk = decode_token(creds.credentials, "access") if creds else None
    user = db.get(User, user_pk) if user_pk else None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user


def require_user(user: User = Depends(current_user)) -> User:
    """Customers only (the admin has no bill of their own)."""
    if user.role != "user":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This is for customer accounts")
    return user


def require_admin(user: User = Depends(current_user)) -> User:
    # The role is read from the database, not trusted from the token.
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user
