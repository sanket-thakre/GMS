import uuid
from datetime import datetime, timezone
from math import ceil
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.core.ticketing import UPLOAD_DIR, compute_due_date, generate_ticket_number
from app.models.attachments import TicketAttachment
from app.models.audit_logs import ActionType, AuditLog
from app.models.categories import GrievanceSubcategory
from app.models.hierarchies import Hierarchy, HierarchyLevel
from app.models.tickets import Ticket, TicketPriority, TicketStatus
from app.models.users import User
from app.schemas.ticket import PaginatedTickets, TicketListItem, TicketOut

# Roles whose ticket view is scoped to their own assigned office.
OFFICER_ROLES = {"APMC_Officer", "DDR_Officer"}
ADMIN_ROLES = {"Admin", "DoM_Admin"}

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
