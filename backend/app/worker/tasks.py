"""Celery tasks for the SLA-escalation sweep (Phase 17).

The task is a thin wrapper: session lifecycle here, escalation logic in
``app.services.escalation_engine`` (kept Celery-free so the FastAPI app and the
Admin debug route can call it without importing Celery).
"""
import logging

from app.db.session import SessionLocal
from app.services.escalation_engine import sweep_breached_tickets
from app.worker.celery_app import celery

logger = logging.getLogger(__name__)


@celery.task(name="app.worker.tasks.sweep_sla_breaches")
def sweep_sla_breaches() -> dict:
    """Scan for SLA-breached tickets and auto-escalate them.

    Returns a summary dict (checked / escalated / ceiling_reached / failed) for
    observability. Triggered every ``SLA_SWEEP_SECONDS`` by celery beat.
    """
    db = SessionLocal()
    try:
        summary = sweep_breached_tickets(db)
    finally:
        db.close()
    return summary
