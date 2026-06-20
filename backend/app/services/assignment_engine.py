"""Phase 14 — Assignment Engine.

Pure routing logic for deciding which office a ticket belongs to, plus a
re-assignment helper that records the move in the audit log. Kept free of
FastAPI imports so it can be unit-tested and reused outside the HTTP layer.
Callers map the raised ValueErrors onto HTTP responses (409 for "no rule",
404 for "missing office").
"""

from sqlalchemy.orm import Session

from app.models.assignment_rules import AssignmentRule
from app.models.audit_logs import ActionType, AuditLog
from app.models.categories import GrievanceSubcategory
from app.models.hierarchies import Hierarchy
from app.models.tickets import Ticket
from app.models.users import User


def resolve_office(db: Session, *, subcategory_id: int, complainant: User | None) -> Hierarchy:
    """Resolve the target office for a newly filed ticket.

    Algorithm (deterministic):
      1. Find the ticket's category via its subcategory.
      2. Collect rules ordered by `priority_order` (asc), then `id` (asc).
      3. Prefer rules whose `category_id` matches; otherwise fall back to the
         `is_default` rules.
      4. Geographic bias (optional refinement): if the complainant belongs to an
         office that one of the candidate rules targets, prefer that rule — this
         keeps a grievance within the complainant's branch when configured.
         Otherwise the highest-priority candidate wins.

    Raises:
        ValueError: if the subcategory is unknown, or no rule (category-specific
            or default) resolves, or the resolved rule points at a missing office.
    """
    subcategory = (
        db.query(GrievanceSubcategory)
        .filter(GrievanceSubcategory.id == subcategory_id)
        .first()
    )
    if subcategory is None:
        raise ValueError("Subcategory not found")
    category_id = subcategory.category_id

    rules = (
        db.query(AssignmentRule)
        .order_by(AssignmentRule.priority_order.asc(), AssignmentRule.id.asc())
        .all()
    )

    category_rules = [r for r in rules if r.category_id == category_id]
    candidates = category_rules if category_rules else [r for r in rules if r.is_default]

    if not candidates:
        raise ValueError(
            "No assignment rule configured for this category and no default rule exists."
        )

    chosen = candidates[0]
    if complainant is not None and complainant.hierarchy_id is not None:
        for rule in candidates:
            if rule.hierarchy_id == complainant.hierarchy_id:
                chosen = rule
                break

    office = db.query(Hierarchy).filter(Hierarchy.id == chosen.hierarchy_id).first()
    if office is None:
        raise ValueError("Assignment rule points to a non-existent office.")
    return office


def reassign(
    db: Session,
    ticket: Ticket,
    new_hierarchy_id: int,
    actor: User,
    reason: str | None = None,
) -> Ticket:
    """Move a ticket to another office and write a `Transferred` audit row.

    Raises:
        ValueError: if the target office does not exist.
    """
    new_office = db.query(Hierarchy).filter(Hierarchy.id == new_hierarchy_id).first()
    if new_office is None:
        raise ValueError("Target office not found")

    old_office = ticket.assigned_hierarchy
    previous_name = old_office.name if old_office else None

    new_state = new_office.name
    if reason:
        new_state = f"{new_state} | Reason: {reason}"

    ticket.assigned_hierarchy_id = new_office.id
    db.add(
        AuditLog(
            ticket_id=ticket.id,
            action_by_user_id=actor.id,
            action_type=ActionType.Transferred,
            previous_state=previous_name,
            new_state=new_state,
        )
    )
    db.commit()
    db.refresh(ticket)
    return ticket
