from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    PROJECT_NAME: str = "Grievance Management System"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5433/gms_db"
    SECRET_KEY: str = "a7f3c9e1d4b8f2a6c5e0d3b7f1a4c8e2d6b9f3a7c1e5d8b2f6a0c4e7d1b5f9"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Phase 17: Celery + Redis for the background SLA-escalation sweep.
    # In a compose network the host is `redis`; for a local venv it's localhost.
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    SLA_SWEEP_SECONDS: int = 300  # how often beat triggers the sweep (5 min)

    model_config = {
        "env_file": Path(__file__).resolve().parents[2] / ".env",
        "extra": "ignore",
    }


settings = Settings()
