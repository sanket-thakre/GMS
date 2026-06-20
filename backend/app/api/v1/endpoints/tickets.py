import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_current_user, get_db
from app.core.ticketing import UPLOAD_DIR, compute_due_date, generate_ticket_number
from app.models.attachments import TicketAttachment
from app.models.audit_logs import ActionType, AuditLog
from app.models.categories import GrievanceSubcategory
from app.models.hierarchies import Hierarchy, HierarchyLevel
from app.models.tickets import Ticket, TicketPriority, TicketStatus
from app.models.users import User
from app.schemas.ticket import TicketOut, TicketStatusUpdate

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


@router.get("/", response_model=list[TicketOut])
def list_tickets(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[TicketStatus] = Query(default=None, alias="status"),
    priority_filter: Optional[TicketPriority] = Query(default=None, alias="priority"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_name = current_user.role.name if current_user.role else None
    query = db.query(Ticket)

    # Officers see only tickets assigned to their office; admins see all.
    if role_name in ("APMC_Officer", "DDR_Officer") and current_user.hierarchy_id:
        query = query.filter(Ticket.assigned_hierarchy_id == current_user.hierarchy_id)
    elif role_name == "Farmer":
        query = query.filter(Ticket.complainant_id == current_user.id)
    # DoM_Admin and Admin see all tickets — no extra filter.

    if status_filter:
        query = query.filter(Ticket.status == status_filter)
    if priority_filter:
        query = query.filter(Ticket.priority == priority_filter)

    offset = (page - 1) * page_size
    return query.order_by(Ticket.created_at.desc()).offset(offset).limit(page_size).all()


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


# Allowed status transitions. Escalation transitions are handled in Phases 17/18.
_ALLOWED_TRANSITIONS: dict[TicketStatus, set[TicketStatus]] = {
    TicketStatus.Open: {TicketStatus.In_Progress},
    TicketStatus.In_Progress: {TicketStatus.Resolved},
    TicketStatus.Resolved: {TicketStatus.Closed, TicketStatus.In_Progress},
}

OFFICER_ROLES = {"APMC_Officer", "DDR_Officer", "DoM_Admin", "Admin"}


@router.patch(
    "/{ticket_id}/status",
    response_model=TicketOut,
    dependencies=[Depends(RoleChecker(["APMC_Officer", "DDR_Officer", "DoM_Admin", "Admin"]))],
)
def update_ticket_status(
    ticket_id: int,
    body: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    role_name = current_user.role.name if current_user.role else None

    # Non-admin officers may only update tickets in their own office.
    if role_name not in ("DoM_Admin", "Admin"):
        if ticket.assigned_hierarchy_id != current_user.hierarchy_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update tickets assigned to your office",
            )

    # Enforce allowed transitions.
    allowed_next = _ALLOWED_TRANSITIONS.get(ticket.status, set())
    if body.status not in allowed_next:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Transition from '{ticket.status.value}' to '{body.status.value}' is not allowed. "
                f"Allowed next states: {[s.value for s in allowed_next]}"
            ),
        )

    previous_state = ticket.status.value
    ticket.status = body.status

    # Set resolved_at when ticket is marked Resolved.
    if body.status == TicketStatus.Resolved:
        ticket.resolved_at = datetime.now(timezone.utc)
    elif body.status == TicketStatus.In_Progress and ticket.resolved_at is not None:
        # Reopened from Resolved — clear the timestamp.
        ticket.resolved_at = None

    # Determine audit action_type.
    if body.status == TicketStatus.Resolved:
        action = ActionType.Resolved
    elif body.status == TicketStatus.Closed:
        action = ActionType.Closed
    else:
        action = ActionType.Status_Changed

    new_state = body.status.value
    if body.note:
        new_state = f"{new_state} | Note: {body.note}"

    db.add(
        AuditLog(
            ticket_id=ticket.id,
            action_by_user_id=current_user.id,
            action_type=action,
            previous_state=previous_state,
            new_state=new_state,
        )
    )

    db.commit()
    db.refresh(ticket)
    return ticket
