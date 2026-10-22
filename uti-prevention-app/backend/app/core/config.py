from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 60
    frontend_origin: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def frontend_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]
        return origins or ["http://localhost:5173"]


settings = Settings()