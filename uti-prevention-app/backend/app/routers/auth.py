from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db import get_db
from app.dependencies import get_current_user
from app.models import PatientIdentity, PatientProfile, User
from app.schemas import PatientDetailsUpdate, UserCreate, UserLogin, UserOut, TokenOut
from app.security import hash_password, verify_password, create_access_token


router = APIRouter(prefix="/api/auth", tags=["authentication"])


def get_or_create_patient_identity(db: Session, user: User) -> PatientIdentity:
    identity = db.scalar(select(PatientIdentity).where(PatientIdentity.user_id == user.id))
    if identity is None:
        identity = PatientIdentity(
            user_id=user.id,
            patient_id=f"PT-{user.id:010d}",
        )
        db.add(identity)
        db.commit()
        db.refresh(identity)
    user.patient_identity = identity
    return identity


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = User(email=email, password_hash=hash_password(payload.password))
    db.add(user)
    db.flush()
    db.add(PatientProfile(user_id=user.id))
    user.patient_identity = PatientIdentity(
        user_id=user.id,
        patient_id=f"PT-{user.id:010d}",
        full_name=payload.full_name,
        contact_number=payload.contact_number,
    )
    db.commit()
    db.refresh(user)

    return TokenOut(access_token=create_access_token(str(user.id)), user=user)


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account is inactive")

    get_or_create_patient_identity(db, user)
    return TokenOut(access_token=create_access_token(str(user.id)), user=user)


@router.get("/me", response_model=UserOut)
def me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_or_create_patient_identity(db, current_user)
    return current_user


@router.patch("/profile", response_model=UserOut)
def update_profile(
    payload: PatientDetailsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    identity = get_or_create_patient_identity(db, current_user)
    identity.full_name = payload.full_name
    identity.contact_number = payload.contact_number
    db.commit()
    db.refresh(current_user)
    return current_user
