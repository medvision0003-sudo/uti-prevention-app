from datetime import date, datetime, timezone
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import ClinicIntake, User


router = APIRouter(prefix="/api/intake", tags=["Clinic Intake"])
INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


class ClinicIntakePayload(BaseModel):
    age: int = Field(ge=1, le=120)
    last_menstrual_period: date | None = None
    postmenopausal: bool
    hysterectomy: bool
    menopause_duration: Literal["early", "recent", "late"] | None = None
    recurrent_uti: bool
    diabetes: bool
    constipation: bool
    loose_motions: bool
    recent_travel: bool
    other_urological_history: bool
    prior_intervention: bool
    prior_stone_surgery: bool
    note: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_menopause_duration(self):
        if self.postmenopausal and self.menopause_duration is None:
            raise ValueError("Select an approximate time since menopause")
        if not self.postmenopausal and self.menopause_duration is not None:
            raise ValueError("Menopause duration is only used when postmenopausal")
        if self.last_menstrual_period and self.last_menstrual_period > datetime.now(INDIA_TIMEZONE).date():
            raise ValueError("Last menstrual period cannot be in the future")
        return self


def serialize_intake(record: ClinicIntake | None) -> dict:
    if record is None:
        return {"completed": False}
    return {
        "completed": True,
        "age": record.age,
        "last_menstrual_period": (
            record.last_menstrual_period.isoformat()
            if record.last_menstrual_period
            else None
        ),
        "postmenopausal": record.postmenopausal,
        "hysterectomy": record.hysterectomy,
        "menopause_duration": record.menopause_duration,
        "recurrent_uti": record.recurrent_uti,
        "diabetes": record.diabetes,
        "constipation": record.constipation,
        "loose_motions": record.loose_motions,
        "recent_travel": record.recent_travel,
        "other_urological_history": record.other_urological_history,
        "prior_intervention": record.prior_intervention,
        "prior_stone_surgery": record.prior_stone_surgery,
        "note": record.note,
        "updated_at": record.updated_at,
    }


@router.get("")
def get_intake(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = db.scalar(select(ClinicIntake).where(ClinicIntake.user_id == user.id))
    return serialize_intake(record)


@router.put("")
def save_intake(
    payload: ClinicIntakePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = db.scalar(select(ClinicIntake).where(ClinicIntake.user_id == user.id))
    if record is None:
        record = ClinicIntake(user_id=user.id, **payload.model_dump())
        db.add(record)
    else:
        for field, value in payload.model_dump().items():
            setattr(record, field, value)
        record.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)
    return serialize_intake(record)
