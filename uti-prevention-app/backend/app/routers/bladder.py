from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import BladderLog, User


router = APIRouter(prefix="/api/bladder", tags=["Bladder Log"])
INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


@router.post("", status_code=201)
def add_bladder_log(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = BladderLog(user_id=user.id, logged_at=datetime.now(timezone.utc))
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "logged_at": entry.logged_at}


@router.get("/today")
def get_today_bladder_logs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    local_now = datetime.now(INDIA_TIMEZONE)
    local_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    start = local_start.astimezone(timezone.utc)
    now = local_now.astimezone(timezone.utc)
    entries = db.scalars(
        select(BladderLog)
        .where(
            BladderLog.user_id == user.id,
            BladderLog.logged_at >= start,
            BladderLog.logged_at <= now,
        )
        .order_by(BladderLog.logged_at.desc())
    ).all()
    return {
        "date": local_start.date().isoformat(),
        "total": len(entries),
        "entries": [
            {"id": entry.id, "logged_at": entry.logged_at}
            for entry in entries
        ],
    }
