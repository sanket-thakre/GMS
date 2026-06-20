from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db
from app.schemas.analytics import BreachByOffice, CountByKey, SummaryStats, TrendPoint
from app.services.analytics import (
    breaches_by_office,
    counts_by_category,
    counts_by_status,
    get_summary,
    trend,
)

router = APIRouter()

_EXEC_ROLES = ["DoM_Admin", "Admin"]


@router.get(
    "/summary",
    response_model=SummaryStats,
    dependencies=[Depends(RoleChecker(_EXEC_ROLES))],
)
def summary(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_summary(db, date_from=date_from, date_to=date_to)


@router.get(
    "/by-category",
    response_model=list[CountByKey],
    dependencies=[Depends(RoleChecker(_EXEC_ROLES))],
)
def by_category(db: Session = Depends(get_db)):
    return counts_by_category(db)


@router.get(
    "/by-status",
    response_model=list[CountByKey],
    dependencies=[Depends(RoleChecker(_EXEC_ROLES))],
)
def by_status(db: Session = Depends(get_db)):
    return counts_by_status(db)


@router.get(
    "/breaches-by-office",
    response_model=list[BreachByOffice],
    dependencies=[Depends(RoleChecker(_EXEC_ROLES))],
)
def breach_by_office(db: Session = Depends(get_db)):
    return breaches_by_office(db)


@router.get(
    "/trend",
    response_model=list[TrendPoint],
    dependencies=[Depends(RoleChecker(_EXEC_ROLES))],
)
def trend_endpoint(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    return trend(db, days=days)
