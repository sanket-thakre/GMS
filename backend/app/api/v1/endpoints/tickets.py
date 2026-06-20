import uuid
from datetime import datetime, timezone
from math import ceil
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import RoleChecker, get_current_user, get_db
from app.core.ticketing import UPLOAD_DIR, compute_due_date, generate_ticket_number
from app.models.attachments import TicketAttachment
from app.models.audit_logs import ActionType, AuditLog
from app.models.categories import GrievanceSubcategory
from app.models.tickets import Ticket, TicketPriority, TicketStatus
from app.models.users import User
from app.schemas.assignment import TicketTransfer
from app.schemas.ticket import (
    PaginatedTickets,
    TicketListItem,
    TicketOut,
    TicketStatusUpdate,
)
from app.services.assignment_engine import reassign, resolve_office

# Roles whose ticket view is scoped to their own assigned office.
OFFICER_ROLES = {"APMC_Officer", "DDR_Officer"}
ADMIN_ROLES = {"Admin", "DoM_Admin"}

router = APIRouter()

# Roles permitted to view any ticket (officers/admins), beyond the complainant owner.
STAFF_ROLES = {"Admin", "DoM_Admin", "DDR_Officer", "APMC_Officer"}


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

    # 3. Route to the correct office via the Assignment Engine (Phase 14).
    try:
        office = resolve_office(
            db, subcategory_id=subcategory.id, complainant=current_user
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

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

    # 6. Audit rows: ticket created, plus the initial routing decision.
    db.add(
        AuditLog(
            ticket_id=ticket.id,
            action_by_user_id=current_user.id,
            action_type=ActionType.Created,
            previous_state=None,
            new_state=TicketStatus.Open.value,
        )
    )
    db.add(
        AuditLog(
            ticket_id=ticket.id,
            action_by_user_id=current_user.id,
            action_type=ActionType.Transferred,
            previous_state=None,
            new_state=office.name,
        )
    )

    # 7. Commit and return.
    db.commit()
    db.refresh(ticket)
    return ticket


def _to_list_item(t: Ticket) -> TicketListItem:
    sub = t.subcategory
    return TicketListItem(
        id=t.id,
        ticket_number=t.ticket_number,
        status=t.status,
        priority=t.priority,
        subcategory_id=t.subcategory_id,
        assigned_hierarchy_id=t.assigned_hierarchy_id,
        complainant_id=t.complainant_id,
        created_at=t.created_at,
        due_date=t.due_date,
        subcategory_name=sub.name if sub else None,
        category_name=sub.category.name if sub and sub.category else None,
        assigned_office_name=t.assigned_hierarchy.name if t.assigned_hierarchy else None,
    )


@router.get("", response_model=PaginatedTickets)
def list_tickets(
    status: TicketStatus | None = None,
    priority: TicketPriority | None = None,
    category_id: int | None = None,
    subcategory_id: int | None = None,
    assigned_hierarchy_id: int | None = None,
    mine: bool = False,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
    sort_by: Literal["created_at", "due_date", "priority", "status"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Ticket).options(
        joinedload(Ticket.subcategory).joinedload(GrievanceSubcategory.category),
        joinedload(Ticket.assigned_hierarchy),
    )

    role_name = current_user.role.name if current_user.role else None

    # --- Role-aware default scoping (applied before user filters) ---
    if role_name in ADMIN_ROLES:
        pass  # full visibility
    elif role_name in OFFICER_ROLES:
        query = query.filter(Ticket.assigned_hierarchy_id == current_user.hierarchy_id)
    else:
        # Complainant (and any non-staff role) → only their own tickets.
        query = query.filter(Ticket.complainant_id == current_user.id)

    # --- Optional filters ---
    if status is not None:
        query = query.filter(Ticket.status == status)
    if priority is not None:
        query = query.filter(Ticket.priority == priority)
    if subcategory_id is not None:
        query = query.filter(Ticket.subcategory_id == subcategory_id)
    if category_id is not None:
        query = query.filter(
            Ticket.subcategory.has(GrievanceSubcategory.category_id == category_id)
        )
    if assigned_hierarchy_id is not None:
        # Honoured for admins; for officers/complainants it can only narrow
        # within what they're already scoped to (safe).
        query = query.filter(Ticket.assigned_hierarchy_id == assigned_hierarchy_id)
    if mine:
        query = query.filter(Ticket.complainant_id == current_user.id)
    if date_from is not None:
        query = query.filter(Ticket.created_at >= date_from)
    if date_to is not None:
        query = query.filter(Ticket.created_at <= date_to)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(Ticket.ticket_number.ilike(like), Ticket.description.ilike(like))
        )

    total = query.count()

    sort_columns = {
        "created_at": Ticket.created_at,
        "due_date": Ticket.due_date,
        "priority": Ticket.priority,
        "status": Ticket.status,
    }
    column = sort_columns[sort_by]
    query = query.order_by(column.asc() if order == "asc" else column.desc())

    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = ceil(total / page_size) if total else 0

    return PaginatedTickets(
        items=[_to_list_item(t) for t in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


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


@router.post(
    "/{ticket_id}/transfer",
    response_model=TicketOut,
    dependencies=[Depends(RoleChecker(["Admin", "DoM_Admin", "DDR_Officer", "APMC_Officer"]))],
)
def transfer_ticket(
    ticket_id: int,
    body: TicketTransfer,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually re-route a ticket to another office (Phase 14).

    Admin/DoM_Admin may transfer any ticket; an officer may only transfer
    tickets currently assigned to their own office. The move is recorded in
    the audit log (action_type=Transferred) by the engine's `reassign`.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    role_name = current_user.role.name if current_user.role else None

    # Non-admin officers may only transfer tickets in their own office.
    if role_name not in ("DoM_Admin", "Admin"):
        if ticket.assigned_hierarchy_id != current_user.hierarchy_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only transfer tickets assigned to your office",
            )

    try:
        ticket = reassign(
            db, ticket, body.hierarchy_id, current_user, reason=body.reason
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    return ticket
