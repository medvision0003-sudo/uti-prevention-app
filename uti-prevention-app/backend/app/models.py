from datetime import date, datetime, timezone
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="patient", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    profile: Mapped["PatientProfile | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    patient_identity: Mapped["PatientIdentity | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )

    @property
    def patient_id(self) -> str:
        return self.patient_identity.patient_id if self.patient_identity else ""

    @property
    def full_name(self) -> str:
        return self.patient_identity.full_name if self.patient_identity else ""

    @property
    def contact_number(self) -> str:
        return self.patient_identity.contact_number if self.patient_identity else ""


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    menopause_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    medical_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurrent_uti_history: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    user: Mapped[User] = relationship(back_populates="profile")


class ClinicIntake(Base):
    __tablename__ = "clinic_intakes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    last_menstrual_period: Mapped[date | None] = mapped_column(Date, nullable=True)
    postmenopausal: Mapped[bool] = mapped_column(Boolean, nullable=False)
    hysterectomy: Mapped[bool] = mapped_column(Boolean, nullable=False)
    menopause_duration: Mapped[str | None] = mapped_column(String(30), nullable=True)
    recurrent_uti: Mapped[bool] = mapped_column(Boolean, nullable=False)
    diabetes: Mapped[bool] = mapped_column(Boolean, nullable=False)
    constipation: Mapped[bool] = mapped_column(Boolean, nullable=False)
    loose_motions: Mapped[bool] = mapped_column(Boolean, nullable=False)
    recent_travel: Mapped[bool] = mapped_column(Boolean, nullable=False)
    other_urological_history: Mapped[bool] = mapped_column(Boolean, nullable=False)
    prior_intervention: Mapped[bool] = mapped_column(Boolean, nullable=False)
    prior_stone_surgery: Mapped[bool] = mapped_column(Boolean, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class PatientIdentity(Base):
    __tablename__ = "patient_identities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    patient_id: Mapped[str] = mapped_column(
        String(15), unique=True, index=True, nullable=False,
    )
    full_name: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    contact_number: Mapped[str] = mapped_column(String(32), nullable=False, default="")

    user: Mapped[User] = relationship(back_populates="patient_identity")


class WaterLog(Base):
    __tablename__ = "water_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount_ml: Mapped[int] = mapped_column(Integer, nullable=False)
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )


class BladderLog(Base):
    __tablename__ = "bladder_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )


class DailyCheckIn(Base):
    __tablename__ = "daily_check_ins"
    __table_args__ = (
        UniqueConstraint("user_id", "check_in_date", name="uq_daily_check_ins_user_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    check_in_date: Mapped[date] = mapped_column(Date, nullable=False)
    bowel_status: Mapped[str] = mapped_column(String(20), nullable=False)
    symptoms: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
