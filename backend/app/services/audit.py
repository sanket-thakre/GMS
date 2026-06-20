"""Centralized audit-logging helper.

Every ticket lifecycle mutation (create, status change, escalation, transfer,
resolve, close, comment) should call ``record_audit`` instead of constructing
``AuditLog`` instances directly.  This keeps the audit contract uniform and
makes it easy to add cross-cutting concerns (e.g. push notifications) later.
"""

from sqlalchemy.orm import Session

from app.models.audit_logs import ActionType, AuditLog


def record_audit(
    db: Session,
    *,
    ticket_id: int,
    actor_user_id: int,
    action_type: ActionType,
    previous_state: str | None = None,
    new_state: str | None = None,
    commit: bool = False,
) -> AuditLog:
    """Create an audit-log row and add it to the current session.

    Parameters
    ----------
    db:
        The active SQLAlchemy session (caller's transaction).
    ticket_id:
        FK to the ticket being audited.
    actor_user_id:
        FK to the user performing the action.
    action_type:
        One of the ``ActionType`` enum members.
    previous_state:
        Optional human-readable description of the state *before* the change.
    new_state:
        Optional human-readable description of the state *after* the change.
    commit:
        If ``True``, the helper will ``db.commit()`` after adding the row.
        Leave ``False`` (default) when the caller needs to commit as part of a
        larger transaction so the audit row and the state change are atomic.

    Returns
    -------
    AuditLog
        The (possibly unflushed) ORM instance.
    """
    entry = AuditLog(
        ticket_id=ticket_id,
        action_by_user_id=actor_user_id,
        action_type=action_type,
        previous_state=previous_state,
        new_state=new_state,
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    return entry
