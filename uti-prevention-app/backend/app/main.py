from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db import Base, engine
from app import models  # noqa: F401 - registers SQLAlchemy models
from app.routers.auth import router as auth_router
from app.routers.bladder import router as bladder_router
from app.routers.check_in import router as check_in_router
from app.routers.export import router as export_router
from app.routers.water import router as water_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Convenient for local development. Use Alembic migrations before production.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="UTI Prevention Behaviour App API",
    version="0.1.0",
    description="Prototype API for habit tracking and patient education; not a diagnostic system.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(water_router)
app.include_router(bladder_router)
app.include_router(check_in_router)
app.include_router(export_router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
