"""First-start data: the admin account, and (optionally) demo customers."""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config
from .database import SessionLocal
from .models import Receipt, User
from .security import hash_password
from .services import current_month, generated_receipt_svg, month_range, save_file, today

log = logging.getLogger("octo.seed")


def seed_admin(db: Session) -> None:
    if db.scalar(select(User).where(User.role == "admin")):
        return
    db.add(
        User(
            user_id=config.ADMIN_USER_ID,
            name=config.ADMIN_NAME,
            password_hash=hash_password(config.ADMIN_PASSWORD),
            role="admin",
            status=0,
            monthly_amount=0,
            start_month=current_month(),
        )
    )
    db.commit()
    log.info("created admin account %r", config.ADMIN_USER_ID)
    if config.ADMIN_PASSWORD == "admin123":
        log.warning("The admin password is still the default. Set ADMIN_PASSWORD before real use.")


def _back(months: int) -> str:
    d = today()
    idx = d.year * 12 + (d.month - 1) - months
    return f"{idx // 12}-{idx % 12 + 1:02d}"


def seed_demo(db: Session) -> None:
    if db.scalar(select(User).where(User.role == "user")):
        return
    cur, start = current_month(), _back(3)
    # (user id, name, password, blocked, months paid, monthly amount)
    people = [
        ("S10500001", "Ali Raza", "user123", 0, month_range(start, cur), 4500),
        ("S10500002", "Sara Khan", "user123", 0, month_range(start, cur), 6000),
        ("S10500003", "Usman Tariq", "user123", 1, month_range(start, _back(1)), 4500),
        ("S10500004", "Hina Malik", "user123", 0, month_range(start, _back(1)), 3500),
        ("S10500005", "Bilal Ahmed", "user123", 1, month_range(start, _back(2)), 4500),
        ("S10500006", "Ayesha Noor", "user123", 0, month_range(start, cur), 5200),
        ("S10500007", "Zain Abbas", "user123", 0, month_range(start, cur), 4500),
        ("S10500008", "Demo Customer", "demo123", 0, [], 4500),  # owes this month, has not paid
    ]
    for user_id, name, password, blocked, paid, amount in people:
        user = User(
            user_id=user_id,
            name=name,
            password_hash=hash_password(password),
            role="user",
            status=blocked,
            monthly_amount=amount,
            start_month=cur if user_id == "S10500008" else start,
        )
        db.add(user)
        db.flush()
        for month in paid:
            svg = generated_receipt_svg(user, month, amount, "jazzcash", "03••••••789")
            y, m = map(int, month.split("-"))
            db.add(
                Receipt(
                    user_pk=user.id,
                    month=month,
                    amount=amount,
                    method="jazzcash",
                    reference="03••••••789",
                    file_path=save_file(user, month, svg, "svg"),
                    content_type="image/svg+xml",
                    uploaded_at=datetime(y, m, 5 + int(user_id[-1]), 11, 30, tzinfo=timezone.utc),
                )
            )
    db.commit()
    log.info("created %d demo customers", len(people))


def run() -> None:
    with SessionLocal() as db:
        seed_admin(db)
        if config.SEED_DEMO:
            seed_demo(db)
