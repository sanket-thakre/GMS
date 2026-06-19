import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.ticketing import UPLOAD_DIR, compute_due_date, generate_ticket_number
from app.models.attachments import TicketAttachment
from app.models.audit_logs import ActionType, AuditLog
from app.models.categories import GrievanceSubcategory
from app.models.hierarchies import Hierarchy, HierarchyLevel
from app.models.tickets import Ticket, TicketPriority, TicketStatus
from app.models.users import User
from app.schemas.ticket import TicketOut

router = APIRouter()

# Roles permitted to view any ticket (officers/admins), beyond the complainant owner.
STAFF_ROLES = {"Admin", "DoM_Admin", "DDR_Officer", "APMC_Officer"}


def _resolve_default_office(db: Session) -> Hierarchy:
    """Pick a triage office for a newly filed ticket.

    TODO(phase14): replace this placeholder with the real Assignment Engine.
    Until then, prefer the first APMC office (front-line intake); fall back to
    any office. `assigned_hierarchy_id` is NOT NULL, so if no office exists yet
    (hierarchy not configured — Phase 9), we cannot file a ticket.
    """
    office = (
        db.query(Hierarchy)
        .filter(Hierarchy.level == HierarchyLevel.APMC)
        .order_by(Hierarchy.id)
        .first()
    )
    if office is None:
        office = db.query(Hierarchy).order_by(Hierarchy.id).first()
    if office is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No office is configured to receive grievances. Configure the hierarchy first.",
        )
    return office


@router.post("/", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def create_ticket(
    subcategory_id: int = Form(...),
    description: str = Form(...),
    priority: TicketPriority = Form(TicketPriority.Medium),
    files: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Validate the subcategory.
    subcategory = (
        db.query(GrievanceSubcategory)
        .filter(GrievanceSubcategory.id == subcategory_id)
        .first()
    )
    if subcategory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found",
        )

    # 2. Unique ticket number.
    ticket_number = generate_ticket_number(db)

    # 3. Assignment placeholder (TODO(phase14): Assignment Engine).
    office = _resolve_default_office(db)

    # 4. SLA due date (created_at is server-set; compute from now in UTC).
    now = datetime.now(timezone.utc)
    due_date = compute_due_date(now, subcategory.sla_hours)

    ticket = Ticket(
        ticket_number=ticket_number,
        complainant_id=current_user.id,
        subcategory_id=subcategory.id,
        assigned_hierarchy_id=office.id,
        status=TicketStatus.Open,
        priority=priority,
        description=description,
        due_date=due_date,
    )
    db.add(ticket)
    db.flush()  # assign ticket.id without committing

    # 5. Persist uploaded files under backend/uploads/ with a UUID-prefixed name.
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    for upload in files:
        if not upload.filename:
            continue
        stored_name = f"{uuid.uuid4().hex}-{upload.filename}"
        dest = UPLOAD_DIR / stored_name
        with dest.open("wb") as buffer:
            buffer.write(upload.file.read())
        db.add(
            TicketAttachment(
                ticket_id=ticket.id,
                file_name=upload.filename,
                file_path=stored_name,
                content_type=upload.content_type,
            )
        )

    # 6. First audit-log row.
    db.add(
        AuditLog(
            ticket_id=ticket.id,
            action_by_user_id=current_user.id,
            action_type=ActionType.Created,
            previous_state=None,
            new_state=TicketStatus.Open.value,
        )
    )

    # 7. Commit and return.
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    is_owner = ticket.complainant_id == current_user.id
    role_name = current_user.role.name if current_user.role else None
    if not is_owner and role_name not in STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Insufficient privileges",
        )

    return ticket
