from datetime import datetime
from pydantic import BaseModel, computed_field
from app.models.tickets import TicketStatus, TicketPriority


class TicketStatusUpdate(BaseModel):
    status: TicketStatus
    note: str | None = None


class TicketCreate(BaseModel):
    """Documentation/validation model for the create payload.

    Note: the endpoint accepts multipart/form-data (so files can ride along),
    so these fields are read via Form(...). The complainant is always taken
    from the auth token, never the payload.
    """

    subcategory_id: int
    description: str
    priority: TicketPriority = TicketPriority.Medium


class AttachmentOut(BaseModel):
    id: int
    file_name: str
    content_type: str | None = None
    file_path: str

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def url(self) -> str:
        return f"/static/uploads/{self.file_path}"


class TicketOut(BaseModel):
    id: int
    ticket_number: str
    status: TicketStatus
    priority: TicketPriority
    description: str | None = None
    subcategory_id: int
    assigned_hierarchy_id: int
    complainant_id: int
    created_at: datetime
    due_date: datetime | None = None
    resolved_at: datetime | None = None
    attachments: list[AttachmentOut] = []

    model_config = {"from_attributes": True}
