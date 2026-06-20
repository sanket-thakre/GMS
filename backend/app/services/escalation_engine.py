"""Escalation engine (Phase 17).

Pure, synchronous escalation logic shared by:
  - the Celery SLA sweep (``app/worker/tasks.py``), which auto-escalates
    breached tickets on a schedule, and
  - the Phase 18 manual escalate endpoint (``api/v1/endpoints/tickets.py``).

Both call :func:`escalate_ticket`. Authorization/ownership checks stay in the
HTTP layer; this module only performs the escalation itself.

Policy notes:
  - **Fresh SLA window**: escalating a ticket to a higher office resets its
    ``due_date`` to ``now + subcategory.sla_hours``, giving the receiving office
    a full window to act (rather than inheriting an already-breached deadline).
  - **Ceiling**: a ticket already at the root office (``parent_id is None``,
    i.e. the DoM) cannot move higher. Rather than loop or silently no-op, the
    engine raises :class:`EscalationCeilingError` so callers can react — the
    sweep counts it, the manual endpoint returns HTTP 400.
  - **Actor**: ``audit_logs.action_by_user_id`` is NOT nullable, so automated
    escalations (``actor_user_id is None``) are attributed to a dedicated,
    non-login ``system`` user (created on demand).
"""
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.audit_logs import ActionType, AuditLog
from app.models.hierarchies import Hierarchy
from app.models.roles import Role
from app.models.tickets import Ticket, TicketStatus
from app.models.users import User

logger = logging.getLogger(__name__)

# Tickets in these states have a stopped SLA clock and are skipped by the sweep.
_TERMINAL_STATUSES = (TicketStatus.Resolved, TicketStatus.Closed)

SYSTEM_USER_EMAIL = "system@gms.gov"


class EscalationCeilingError(Exception):
    """Raised when a ticket is already at the top office and cannot escalate."""


def get_or_create_system_user(db: Session) -> User:
    """Return the dedicated ``system`` user used to attribute auto-escalations.

    Created on demand with an unusable random password so it can never log in.
    """
    user = db.query(User).filter(User.email == SYSTEM_USER_EMAIL).first()
    if user is not None:
        return user

    # Prefer an admin-tier role; fall back to whatever role exists.
    role = (
        db.query(Role).filter(Role.name == "Admin").first()
        or db.query(Role).filter(Role.name == "DoM_Admin").first()
        or db.query(Role).first()
    )
    if role is None:
        raise RuntimeError("No roles seeded — run seed_dev.py before escalating")

    user = User(
        full_name="System (Automated)",
        email=SYSTEM_USER_EMAIL,
        hashed_password=get_password_hash(secrets.token_urlsafe(32)),
        role_id=role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Created system user (id=%s) for automated escalations", user.id)
    return user


def escalate_ticket(
    db: Session,
    ticket: Ticket,
    actor_user_id: int | None = None,
    reason: str = "SLA breach",
) -> Ticket:
    """Escalate ``ticket`` one level up its office hierarchy.

    Reassigns to the parent office, sets status ``Escalated``, refreshes the
    SLA ``due_date`` for the new tier, and writes an ``Escalated`` audit row
    (old office name → new office name, with the reason). Commits and returns
    the refreshed ticket.

    Raises:
        EscalationCeilingError: the ticket is already at the root office.
        ValueError: the ticket's current/parent office cannot be resolved.
    """
    current_office = (
        db.query(Hierarchy).filter(Hierarchy.id == ticket.assigned_hierarchy_id).first()
    )
    if current_office is None:
        raise ValueError("Ticket has no valid assigned office")

    if current_office.parent_id is None:
        logger.info(
            "Escalation ceiling reached: ticket %s already at top office '%s'",
            ticket.id,
            current_office.name,
        )
        raise EscalationCeilingError(
            "Ticket is already at the top-level office and cannot be escalated further"
        )

    parent_office = (
        db.query(Hierarchy).filter(Hierarchy.id == current_office.parent_id).first()
    )
    if parent_office is None:
        raise ValueError("Parent office not found for escalation")

    if actor_user_id is None:
        actor_user_id = get_or_create_system_user(db).id

    # Fresh SLA window for the receiving office (policy — see module docstring).
    now = datetime.now(timezone.utc)
    subcategory = ticket.subcategory
    if subcategory is not None:
        ticket.due_date = now + timedelta(hours=subcategory.sla_hours)

    previous_office_name = current_office.name
    ticket.assigned_hierarchy_id = parent_office.id
    ticket.status = TicketStatus.Escalated

    db.add(
        AuditLog(
            ticket_id=ticket.id,
            action_by_user_id=actor_user_id,
            action_type=ActionType.Escalated,
            previous_state=previous_office_name,
            new_state=f"{parent_office.name} | Reason: {reason}",
        )
    )

    db.commit()
    db.refresh(ticket)
    return ticket


def sweep_breached_tickets(db: Session) -> dict:
    """Find SLA-breached tickets and auto-escalate each one.

    A ticket is breached when ``due_date < now`` and it is not Resolved/Closed.
    Each escalation is isolated in try/except so one bad row can't abort the
    batch. Returns a summary dict for observability.
    """
    now = datetime.now(timezone.utc)
    breached = (
        db.query(Ticket)
        .filter(Ticket.due_date.isnot(None))
        .filter(Ticket.due_date < now)
        .filter(Ticket.status.notin_(_TERMINAL_STATUSES))
        .all()
    )

    summary = {"checked": len(breached), "escalated": 0, "ceiling_reached": 0, "failed": 0}

    for ticket in breached:
        try:
            escalate_ticket(db, ticket, actor_user_id=None, reason="SLA breach")
            summary["escalated"] += 1
        except EscalationCeilingError:
            summary["ceiling_reached"] += 1
        except Exception:  # noqa: BLE001 — one failure must not abort the batch
            db.rollback()
            summary["failed"] += 1
            logger.exception("Failed to escalate ticket %s during SLA sweep", ticket.id)

    logger.info(
        "SLA sweep complete: checked=%(checked)s escalated=%(escalated)s "
        "ceiling_reached=%(ceiling_reached)s failed=%(failed)s",
        summary,
    )
    return summary
