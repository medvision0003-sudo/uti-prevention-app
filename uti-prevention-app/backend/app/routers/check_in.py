from datetime import datetime, timezone
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import DailyCheckIn, User


router = APIRouter(prefix="/api/check-in", tags=["Daily Check-In"])
INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")
SYMPTOMS = (
    "burning_urination",
    "urgency",
    "frequent_urination",
    "lower_abdominal_pain",
    "blood_in_urine",
    "fever",
    "back_or_flank_pain",
    "nausea_or_vomiting",
)
RED_FLAG_SYMPTOMS = {
    "blood_in_urine",
    "fever",
    "back_or_flank_pain",
    "nausea_or_vomiting",
}
URINARY_SYMPTOMS = {
    "burning_urination",
    "urgency",
    "frequent_urination",
    "lower_abdominal_pain",
}
SYMPTOM_LABELS = {
    "burning_urination": "burning when urinating",
    "urgency": "urinary urgency",
    "frequent_urination": "frequent urination",
    "lower_abdominal_pain": "lower abdominal pain",
    "blood_in_urine": "blood in urine",
    "fever": "fever",
    "back_or_flank_pain": "back or side pain",
    "nausea_or_vomiting": "nausea or vomiting",
}


class CheckInPayload(BaseModel):
    bowel_status: Literal["normal", "hard_stool", "no_stool"]
    symptoms: list[Literal[
        "burning_urination",
        "urgency",
        "frequent_urination",
        "lower_abdominal_pain",
        "blood_in_urine",
        "fever",
        "back_or_flank_pain",
        "nausea_or_vomiting",
    ]] = Field(max_length=len(SYMPTOMS))


def get_guidance(bowel_status: str, symptoms: list[str]) -> list[str]:
    guidance = []
    symptom_set = set(symptoms)

    if symptom_set & RED_FLAG_SYMPTOMS:
        guidance.append(
            "You selected a symptom such as fever, back or side pain, blood in urine, "
            "or nausea/vomiting. Contact a healthcare professional promptly for advice; "
            "seek urgent care if symptoms are severe or worsening."
        )
    elif symptom_set & URINARY_SYMPTOMS:
        selected = ", ".join(SYMPTOM_LABELS[item] for item in symptoms)
        guidance.append(
            f"You recorded {selected}. This check-in cannot diagnose the cause. "
            "Consider contacting a healthcare professional, especially if symptoms "
            "persist, worsen, or recur."
        )
    else:
        guidance.append(
            "No urinary symptoms were selected. Keep tracking how you feel and seek "
            "professional advice if concerning symptoms develop."
        )

    if bowel_status == "hard_stool":
        guidance.append(
            "You recorded hard stool. Consider discussing persistent constipation "
            "with a healthcare professional; follow any personal dietary or fluid advice "
            "you have been given."
        )
    elif bowel_status == "no_stool":
        guidance.append(
            "You recorded no stool today. A single day can vary; note the pattern and "
            "seek advice for persistent constipation, severe pain, or blood in stool."
        )

    return guidance


def serialize_check_in(entry: DailyCheckIn) -> dict:
    return {
        "date": entry.check_in_date.isoformat(),
        "bowel_status": entry.bowel_status,
        "symptoms": entry.symptoms,
        "guidance": get_guidance(entry.bowel_status, entry.symptoms),
        "updated_at": entry.updated_at,
    }


@router.put("/today")
def save_today_check_in(
    payload: CheckInPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = datetime.now(INDIA_TIMEZONE).date()
    entry = db.scalar(
        select(DailyCheckIn).where(
            DailyCheckIn.user_id == user.id,
            DailyCheckIn.check_in_date == today,
        )
    )
    if entry is None:
        entry = DailyCheckIn(
            user_id=user.id,
            check_in_date=today,
            bowel_status=payload.bowel_status,
            symptoms=payload.symptoms,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(entry)
    else:
        entry.bowel_status = payload.bowel_status
        entry.symptoms = payload.symptoms
        entry.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(entry)
    return serialize_check_in(entry)


@router.get("/today")
def get_today_check_in(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = datetime.now(INDIA_TIMEZONE).date()
    entry = db.scalar(
        select(DailyCheckIn).where(
            DailyCheckIn.user_id == user.id,
            DailyCheckIn.check_in_date == today,
        )
    )
    if entry is None:
        return {
            "date": today.isoformat(),
            "bowel_status": None,
            "symptoms": [],
            "guidance": [],
            "updated_at": None,
        }
    return serialize_check_in(entry)


@router.get("/history")
def get_check_in_history(
    limit: int = 30,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    safe_limit = min(max(limit, 1), 90)
    entries = db.scalars(
        select(DailyCheckIn)
        .where(DailyCheckIn.user_id == user.id)
        .order_by(DailyCheckIn.check_in_date.desc())
        .limit(safe_limit)
    ).all()
    return {"entries": [serialize_check_in(entry) for entry in entries]}
