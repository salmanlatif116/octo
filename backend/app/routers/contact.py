import logging

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ContactMessage
from ..schemas import ClientLogIn, ContactIn
from ..services import client_ip

router = APIRouter(prefix="/api/v1", tags=["misc"])
log = logging.getLogger("octo.contact")
client_log = logging.getLogger("octo.client")


@router.post("/contact/", status_code=status.HTTP_201_CREATED)
def send_message(body: ContactIn, db: Session = Depends(get_db)):
    db.add(ContactMessage(**body.model_dump()))
    db.commit()
    log.info("contact message received from %s (%s)", body.name, body.email)
    return {"status": "ok"}


@router.post("/client-logs/", status_code=status.HTTP_204_NO_CONTENT)
def client_error(body: ClientLogIn, request: Request):
    """The browser reports an error it caught, so it lands in the same log as server errors."""
    client_log.error("browser error at %s from %s: %s\n%s", body.url, client_ip(request), body.message, body.stack or "")
