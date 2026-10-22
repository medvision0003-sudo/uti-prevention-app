from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import User, WaterLog


router = APIRouter(prefix="/api/water", tags=["Water Tracking"])
INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


class WaterEntry(BaseModel):
    amount_ml: int = Field(gt=0, le=5000)


@router.post("", status_code=201)
def add_water(
    payload: WaterEntry,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = WaterLog(
        user_id=user.id,
        amount_ml=payload.amount_ml,
        logged_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "id": entry.id,
        "amount_ml": entry.amount_ml,
        "logged_at": entry.logged_at,
    }


@router.get("/today")
def get_today_water(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    local_now = datetime.now(INDIA_TIMEZONE)
    local_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    start = local_start.astimezone(timezone.utc)
    now = local_now.astimezone(timezone.utc)
    query = (
        select(WaterLog)
        .where(
            WaterLog.user_id == user.id,
            WaterLog.logged_at >= start,
            WaterLog.logged_at <= now,
        )
        .order_by(WaterLog.logged_at.desc())
    )
    entries = db.scalars(query).all()
    return {
        "date": local_start.date().isoformat(),
        "total_ml": sum(entry.amount_ml for entry in entries),
        "entries": [
            {
                "id": entry.id,
                "amount_ml": entry.amount_ml,
                "logged_at": entry.logged_at,
            }
            for entry in entries
        ],
    }
