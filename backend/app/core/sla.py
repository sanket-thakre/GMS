"""SLA standing computation (Phase 16).

Derives a Green/Amber/Red/Breached urgency status for a ticket from its
``due_date`` relative to now. This is a *derived*, time-dependent value — it is
deliberately **not** stored on the row; it is computed when serializing
responses so it always reflects the current clock.

Note: actual auto-escalation on breach is Phase 17 (Celery). This module only
reports standing.
"""
from datetime import datetime, timezone
from typing import Literal, Optional

from app.models.tickets import TicketStatus

SLA_STATUS = Literal["green", "amber", "red", "breached"]

# Thresholds expressed as the fraction of the *total* SLA window still left
# (remaining / (due_date - created_at)). Kept as module constants so they are
# easy to tune without touching the logic:
#   > 50% remaining     -> green
#   10%–50% remaining   -> amber
#   < 10% remaining     -> red
#   <= 0 (past due)     -> breached
GREEN_THRESHOLD = 0.50
AMBER_THRESHOLD = 0.10

# Statuses for which the SLA clock has stopped (no further countdown).
_STOPPED_STATUSES = {TicketStatus.Resolved, TicketStatus.Closed}


def _ensure_aware(dt: datetime) -> datetime:
    """Treat naive datetimes (defensive — DB columns are timezone-aware) as UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def compute_sla(
    due_date: Optional[datetime],
    status: TicketStatus,
    created_at: Optional[datetime] = None,
    now: Optional[datetime] = None,
) -> dict:
    """Return ``{"sla_status", "time_remaining_seconds"}`` for a ticket.

    - Resolved/Closed tickets have a stopped clock → always ``green`` with a
      ``None`` countdown, regardless of ``due_date``.
    - ``remaining = (due_date - now).total_seconds()``; ``<= 0`` → ``breached``.
    - ``created_at`` sizes the total SLA window so the Amber/Red bands are a
      fraction of *this ticket's* window rather than an absolute duration. When
      it is not supplied (window unknown) a not-yet-due ticket is reported
      ``green``.

    Uses timezone-aware UTC for ``now``.
    """
    if status in _STOPPED_STATUSES:
        return {"sla_status": "green", "time_remaining_seconds": None}

    if now is None:
        now = datetime.now(timezone.utc)

    if due_date is None:
        # No deadline known — nothing to assess.
        return {"sla_status": "green", "time_remaining_seconds": None}

    due_date = _ensure_aware(due_date)
    now = _ensure_aware(now)

    remaining = (due_date - now).total_seconds()

    if remaining <= 0:
        return {"sla_status": "breached", "time_remaining_seconds": int(remaining)}

    sla_status: SLA_STATUS = "green"
    if created_at is not None:
        total_window = (due_date - _ensure_aware(created_at)).total_seconds()
        if total_window > 0:
            fraction_left = remaining / total_window
            if fraction_left > GREEN_THRESHOLD:
                sla_status = "green"
            elif fraction_left >= AMBER_THRESHOLD:
                sla_status = "amber"
            else:
                sla_status = "red"

    return {"sla_status": sla_status, "time_remaining_seconds": int(remaining)}
