from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.models.users import User
from app.schemas.user import UserOut

router = APIRouter()


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        phone=current_user.phone,
        role_id=current_user.role_id,
        role_name=current_user.role.name if current_user.role else "Unknown",
    )
