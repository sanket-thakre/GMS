from fastapi import APIRouter, Depends
from app.api.deps import RoleChecker
from app.models.users import User

router = APIRouter()

allow_admin = RoleChecker(["Admin"])
allow_officers_and_above = RoleChecker(["Admin", "DoM_Admin", "DDR_Officer", "APMC_Officer"])


@router.get("/only-admin")
def admin_only(user: User = Depends(allow_admin)):
    return {"message": f"Welcome Admin: {user.full_name}"}


@router.get("/officers-and-above")
def officers_and_above(user: User = Depends(allow_officers_and_above)):
    return {"message": f"Welcome Officer: {user.full_name}", "role": user.role.name}
