from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db
from app.models.users import User
from app.services.escalation_engine import sweep_breached_tickets

router = APIRouter()

allow_admin = RoleChecker(["Admin"])
allow_officers_and_above = RoleChecker(["Admin", "DoM_Admin", "DDR_Officer", "APMC_Officer"])


@router.get("/only-admin")
def admin_only(user: User = Depends(allow_admin)):
    return {"message": f"Welcome Admin: {user.full_name}"}


@router.get("/officers-and-above")
def officers_and_above(user: User = Depends(allow_officers_and_above)):
    return {"message": f"Welcome Officer: {user.full_name}", "role": user.role.name}


@router.post("/run-sla-sweep")
def run_sla_sweep(
    db: Session = Depends(get_db),
    _: User = Depends(allow_admin),
):
    """Phase 17 debug hook: run the SLA-breach sweep inline (Admin-only).

    Mirrors what celery beat triggers on a schedule, but synchronously and
    without a broker — handy for local verification. Returns a summary dict:
    ``{"checked", "escalated", "ceiling_reached", "failed"}``.
    """
    return sweep_breached_tickets(db)
