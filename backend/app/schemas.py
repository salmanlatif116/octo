from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

USER_ID_PATTERN = r"^[A-Za-z0-9_.-]{3,40}$"


# ---- auth -----------------------------------------------------------------

class LoginIn(BaseModel):
    user_id: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=1, max_length=128)


class RefreshIn(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    user_id: str
    name: str
    role: Literal["user", "admin"]
    status: int  # 1 = blocked, 0 = active

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    user: UserOut


# ---- receipts / customer --------------------------------------------------

class ReceiptOut(BaseModel):
    id: int
    month: str
    amount: int
    method: Literal["jazzcash", "bank"] | None
    reference: str | None
    uploaded_at: datetime
    # filled in for the admin views
    user_id: str | None = None
    user_name: str | None = None


class SummaryOut(BaseModel):
    user_id: str
    name: str
    status: int  # the admin's flag: 1 = blocked, 0 = unblocked
    active: bool  # what the customer sees: unblocked AND nothing outstanding
    monthly_amount: int
    unpaid_months: list[str]
    outstanding_amount: int


class PayIn(BaseModel):
    method: Literal["jazzcash", "bank"]
    # JazzCash: 11-digit mobile number starting with 03
    account_number: str | None = None
    # Bank: card number + expiry (MM/YY). The CVV is never sent to the server.
    card_number: str | None = None
    card_expiry: str | None = None

    @field_validator("account_number", "card_number", mode="before")
    @classmethod
    def digits_only(cls, v):
        return "".join(ch for ch in v if ch.isdigit()) if isinstance(v, str) else v


# ---- admin ----------------------------------------------------------------

class ReceiptBrief(BaseModel):
    id: int
    uploaded_at: datetime
    method: Literal["jazzcash", "bank"] | None


class AdminUserRow(BaseModel):
    user_id: str
    name: str
    status: int
    monthly_amount: int
    start_month: str
    owes: bool  # the selected month is on or after the user's start month
    receipt: ReceiptBrief | None  # this month's receipt


class MonthRow(BaseModel):
    month: str
    receipt: ReceiptOut | None


class AdminUserDetail(BaseModel):
    user_id: str
    name: str
    status: int
    monthly_amount: int
    start_month: str
    unpaid_count: int
    outstanding_amount: int
    months: list[MonthRow]  # newest first


class AdminReceiptsOut(BaseModel):
    month: str
    receipts: list[ReceiptOut]
    missing: list[AdminUserRow]


class CreateUserIn(BaseModel):
    user_id: str = Field(pattern=USER_ID_PATTERN)
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=4, max_length=128)
    monthly_amount: int | None = Field(default=None, ge=1, le=10_000_000)


class UpdateUserIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    monthly_amount: int | None = Field(default=None, ge=1, le=10_000_000)


class StatusIn(BaseModel):
    status: Literal[0, 1]


class PasswordIn(BaseModel):
    password: str = Field(min_length=4, max_length=128)


class LogOut(BaseModel):
    id: int
    created_at: datetime
    actor: str
    action: str
    target: str | None
    detail: str | None
    ip: str | None
    request_id: str | None
    success: bool


class LogsPage(BaseModel):
    total: int
    items: list[LogOut]


# ---- misc -----------------------------------------------------------------

class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=255)
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=10, max_length=5000)


class ClientLogIn(BaseModel):
    """An error the browser caught, so UI problems show up in the same log as server problems."""

    message: str = Field(max_length=2000)
    stack: str | None = Field(default=None, max_length=8000)
    url: str | None = Field(default=None, max_length=500)
