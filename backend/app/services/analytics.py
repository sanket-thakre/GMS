from datetime import datetime, timezone, timedelta

from sqlalchemy import func, case, extract
from sqlalchemy.orm import Session

from app.models.categories import GrievanceCategory, GrievanceSubcategory
from app.models.hierarchies import Hierarchy
from app.models.tickets import Ticket, TicketStatus
from app.schemas.analytics import BreachByOffice, CountByKey, SummaryStats, TrendPoint

_TERMINAL = (TicketStatus.Resolved, TicketStatus.Closed)


def get_summary(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> SummaryStats:
    now = datetime.now(timezone.utc)

    q = db.query(Ticket)
    if date_from:
        q = q.filter(Ticket.created_at >= date_from)
    if date_to:
        q = q.filter(Ticket.created_at <= date_to)

    # Single GROUP BY status pass for all status counts.
    rows = (
        q.with_entities(Ticket.status, func.count(Ticket.id))
        .group_by(Ticket.status)
        .all()
    )
    counts: dict[str, int] = {r[0].value: r[1] for r in rows}

    total = sum(counts.values())
    open_ = counts.get("Open", 0)
    in_progress = counts.get("In_Progress", 0)
    escalated = counts.get("Escalated", 0)
    resolved = counts.get("Resolved", 0)
    closed = counts.get("Closed", 0)

    # Breached: overdue and not yet in a terminal state.
    breached_q = q.filter(
        Ticket.due_date < now,
        Ticket.status.notin_(_TERMINAL),
    )
    breached = breached_q.count()

    # Average resolution time (hours) across resolved tickets only.
    avg_row = (
        db.query(
            func.avg(
                extract("epoch", Ticket.resolved_at) - extract("epoch", Ticket.created_at)
            )
        )
        .filter(Ticket.status == TicketStatus.Resolved, Ticket.resolved_at.isnot(None))
        .scalar()
    )
    avg_resolution_hours = round(float(avg_row) / 3600, 2) if avg_row is not None else None

    return SummaryStats(
        total=total,
        open=open_,
        in_progress=in_progress,
        escalated=escalated,
        resolved=resolved,
        closed=closed,
        breached=breached,
        avg_resolution_hours=avg_resolution_hours,
    )


def counts_by_category(db: Session) -> list[CountByKey]:
    rows = (
        db.query(GrievanceCategory.id, GrievanceCategory.name, func.count(Ticket.id))
        .join(GrievanceSubcategory, GrievanceSubcategory.category_id == GrievanceCategory.id)
        .join(Ticket, Ticket.subcategory_id == GrievanceSubcategory.id)
        .group_by(GrievanceCategory.id, GrievanceCategory.name)
        .all()
    )
    return [CountByKey(key=str(r[0]), label=r[1], count=r[2]) for r in rows]


def counts_by_status(db: Session) -> list[CountByKey]:
    rows = (
        db.query(Ticket.status, func.count(Ticket.id))
        .group_by(Ticket.status)
        .all()
    )
    return [CountByKey(key=r[0].value, label=r[0].value.replace("_", " "), count=r[1]) for r in rows]


def breaches_by_office(db: Session) -> list[BreachByOffice]:
    now = datetime.now(timezone.utc)

    rows = (
        db.query(
            Hierarchy.id,
            Hierarchy.name,
            Hierarchy.level,
            func.count(Ticket.id).label("total"),
            func.sum(
                case(
                    (
                        (Ticket.due_date < now) & Ticket.status.notin_(_TERMINAL),
                        1,
                    ),
                    else_=0,
                )
            ).label("breached"),
        )
        .join(Ticket, Ticket.assigned_hierarchy_id == Hierarchy.id)
        .group_by(Hierarchy.id, Hierarchy.name, Hierarchy.level)
        .all()
    )

    result = []
    for r in rows:
        total = r[3]
        breached = int(r[4] or 0)
        breach_rate = round(breached / total, 4) if total else 0.0
        result.append(
            BreachByOffice(
                hierarchy_id=r[0],
                office_name=r[1],
                level=r[2].value if hasattr(r[2], "value") else str(r[2]),
                total=total,
                breached=breached,
                breach_rate=breach_rate,
            )
        )
    return result


def trend(db: Session, *, days: int = 30) -> list[TrendPoint]:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    # Created counts grouped by date.
    created_rows = (
        db.query(
            func.date(Ticket.created_at).label("day"),
            func.count(Ticket.id),
        )
        .filter(Ticket.created_at >= start)
        .group_by(func.date(Ticket.created_at))
        .all()
    )

    # Resolved counts grouped by resolved_at date.
    resolved_rows = (
        db.query(
            func.date(Ticket.resolved_at).label("day"),
            func.count(Ticket.id),
        )
        .filter(
            Ticket.resolved_at.isnot(None),
            Ticket.resolved_at >= start,
        )
        .group_by(func.date(Ticket.resolved_at))
        .all()
    )

    created_map: dict[str, int] = {str(r[0]): r[1] for r in created_rows}
    resolved_map: dict[str, int] = {str(r[0]): r[1] for r in resolved_rows}

    # Zero-fill every day in the window.
    points: list[TrendPoint] = []
    for i in range(days):
        day = (start + timedelta(days=i + 1)).strftime("%Y-%m-%d")
        points.append(
            TrendPoint(
                date=day,
                created=created_map.get(day, 0),
                resolved=resolved_map.get(day, 0),
            )
        )
    return points
