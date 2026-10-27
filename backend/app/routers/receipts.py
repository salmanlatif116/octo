import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import config
from ..database import get_db
from ..deps import current_user
from ..models import Receipt, User

router = APIRouter(prefix="/api/v1/receipts", tags=["receipts"])
log = logging.getLogger("octo.receipts")


@router.get("/{receipt_id}/file/")
def receipt_file(receipt_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """The receipt image. Only its owner or an admin may fetch it (files are never served as public static files)."""
    receipt = db.get(Receipt, receipt_id)
    # Same 404 for "does not exist" and "not yours", so ids cannot be probed.
    if not receipt or (user.role != "admin" and receipt.user_pk != user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Receipt not found")
    path = config.UPLOAD_DIR / receipt.file_path
    if not path.is_file():
        log.error("receipt %s is in the database but its file is missing: %s", receipt.id, path)
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Receipt file is missing")
    return FileResponse(path, media_type=receipt.content_type, headers={"Cache-Control": "private, max-age=300"})
