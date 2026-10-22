from datetime import datetime
import re
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class PatientDetails(BaseModel):
    full_name: str = Field(min_length=1, max_length=160)
    contact_number: str = Field(min_length=7, max_length=32)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name is required")
        return value

    @field_validator("contact_number")
    @classmethod
    def validate_contact_number(cls, value: str) -> str:
        value = value.strip()
        digits = re.sub(r"\D", "", value)
        if not re.fullmatch(r"\+?[0-9][0-9\s().-]*", value) or not 7 <= len(digits) <= 15:
            raise ValueError("Enter a valid contact number with 7 to 15 digits")
        return value


class UserCreate(PatientDetails):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class PatientDetailsUpdate(PatientDetails):
    pass


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime
    patient_id: str
    full_name: str
    contact_number: str
    model_config = ConfigDict(from_attributes=True)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
