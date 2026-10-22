
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.bladder import router as bladder_router
from app.routers.check_in import router as check_in_router
from app.routers.export import router as export_router
from app.routers.water import router as water_router


app = FastAPI(
    title="UTI Prevention Behaviour App API",
    version="0.1.0",
    description=(
        "Prototype API for habit tracking and patient education; "
        "not a diagnostic system."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://uti-prevention-app-lzb9-dgxux3wj2m-medvision0003-sudo.vercel.app",
        "https://uti-prevention-app-lzb9-git-main-medvision0003-sudo.vercel.app",
    ],
    allow_origin_regex=r"https://uti-prevention-app.*\.vercel\.app",
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
