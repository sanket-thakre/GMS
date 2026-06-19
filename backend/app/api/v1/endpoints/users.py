from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, contains_eager
from app.api.deps import get_current_user, get_db, RoleChecker
from app.models.users import User
from app.models.roles import Role
from app.models.hierarchies import Hierarchy
from app.schemas.user import UserOut, UserListItem, UserAdminUpdate

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


@router.get("", response_model=list[UserListItem])
def list_users(
    role: str | None = None,
    hierarchy_id: int | None = None,
    unassigned: bool = False,
    db: Session = Depends(get_db),
    current_user = Depends(RoleChecker(["Admin", "DoM_Admin"]))
):
    # Join role (required) and hierarchy (optional)
    query = db.query(User).join(User.role).join(User.hierarchy, isouter=True)
    
    # Optimization: use contains_eager to avoid double joins when accessing attributes
    query = query.options(contains_eager(User.role), contains_eager(User.hierarchy))
    
    if role:
        query = query.filter(Role.name == role)
    if hierarchy_id:
        query = query.filter(Hierarchy.id == hierarchy_id)
    if unassigned:
        query = query.filter(User.hierarchy_id == None)

    # UserListItem needs role_name / hierarchy_name, which aren't attributes on
    # the User model — build the schema explicitly from the eager-loaded relationships.
    return [
        UserListItem(
            id=u.id,
            full_name=u.full_name,
            email=u.email,
            phone=u.phone,
            role_id=u.role_id,
            role_name=u.role.name if u.role else "Unknown",
            hierarchy_id=u.hierarchy_id,
            hierarchy_name=u.hierarchy.name if u.hierarchy else None,
        )
        for u in query.all()
    ]


@router.patch("/{user_id}/assign", response_model=UserListItem)
def assign_user(
    user_id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(RoleChecker(["Admin", "DoM_Admin"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
        
    db.commit()
    db.refresh(user)
    
    # Return UserListItem which requires role_name and hierarchy_name
    return UserListItem(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role_id=user.role_id,
        role_name=user.role.name if user.role else "Unknown",
        hierarchy_id=user.hierarchy_id,
        hierarchy_name=user.hierarchy.name if user.hierarchy else None
    )
