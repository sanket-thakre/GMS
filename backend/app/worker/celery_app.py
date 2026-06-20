"""Celery application + beat schedule for the SLA-escalation sweep (Phase 17).

Run locally (inside the venv) until the backend Dockerfile lands in Phase 25:
    celery -A app.worker.celery_app.celery worker -l info
    celery -A app.worker.celery_app.celery beat   -l info
"""
from celery import Celery

from app.core.config import settings

celery = Celery(
    "gms",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery.conf.beat_schedule = {
    "sla-sweep": {
        "task": "app.worker.tasks.sweep_sla_breaches",
        "schedule": float(settings.SLA_SWEEP_SECONDS),
    },
}
celery.conf.timezone = "UTC"

# Import the task module so @celery.task registrations are discovered.
import app.worker.tasks  # noqa: E402,F401
