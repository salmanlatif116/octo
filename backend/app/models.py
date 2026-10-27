from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """A customer or the admin. Customers log in with the User ID the admin gave them."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)  # the login name, e.g. S10500001
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(10), default="user")  # "user" | "admin"
    # 1 = blocked (inactive), 0 = unblocked (active). Only an admin changes this.
    status: Mapped[int] = mapped_column(SmallInteger, default=0)
    monthly_amount: Mapped[int] = mapped_column(Integer)
    # "YYYY-MM": the first month this customer owes a payment
    start_month: Mapped[str] = mapped_column(String(7))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    receipts: Mapped[list["Receipt"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Receipt(Base):
    """Proof of payment for one month: an uploaded screenshot or a (simulated) JazzCash / card payment."""

    __tablename__ = "receipts"
    __table_args__ = (UniqueConstraint("user_pk", "month", name="uq_receipt_user_month"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_pk: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    month: Mapped[str] = mapped_column(String(7), index=True)  # "YYYY-MM" the receipt pays for
    amount: Mapped[int] = mapped_column(Integer)
    method: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "jazzcash" | "bank" | None = screenshot
    reference: Mapped[str | None] = mapped_column(String(40), nullable=True)  # masked, e.g. "03••••••789"
    file_path: Mapped[str] = mapped_column(String(300))  # relative to UPLOAD_DIR
    content_type: Mapped[str] = mapped_column(String(40))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship(back_populates="receipts")


class AuditLog(Base):
    """Who did what, when. Shown to the admin on the Activity screen."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    actor: Mapped[str] = mapped_column(String(40), index=True)  # User ID, or "anonymous"
    action: Mapped[str] = mapped_column(String(40), index=True)  # e.g. "login", "user.block"
    target: Mapped[str | None] = mapped_column(String(80), nullable=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(16), nullable=True)
    success: Mapped[int] = mapped_column(SmallInteger, default=1)


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
