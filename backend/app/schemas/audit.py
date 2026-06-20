"""Pydantic schemas for the audit trail API."""

from datetime import datetime

from pydantic import BaseModel

from app.models.audit_logs import ActionType


class AuditEntryOut(BaseModel):
    """Single entry returned by ``GET /tickets/{id}/audit``."""

    id: int
    action_type: ActionType
    previous_state: str | None = None
    new_state: str | None = None
    timestamp: datetime
    action_by_user_id: int
    actor_name: str  # joined from User.full_name

    model_config = {"from_attributes": True}
