from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, RoleChecker
from app.models.assignment_rules import AssignmentRule
from app.models.categories import GrievanceCategory
from app.models.hierarchies import Hierarchy
from app.models.users import User
from app.schemas.assignment import (
    AssignmentRuleCreate,
    AssignmentRuleOut,
    AssignmentRuleUpdate,
)

router = APIRouter()

# Admin-only management of routing rules.
allow_admin = RoleChecker(["Admin", "DoM_Admin"])


def _validate_targets(db: Session, *, hierarchy_id: int | None, category_id: int | None) -> None:
    """Ensure referenced office/category exist before persisting a rule."""
    if hierarchy_id is not None:
        office = db.query(Hierarchy).filter(Hierarchy.id == hierarchy_id).first()
        if office is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target office (hierarchy) not found",
            )
    if category_id is not None:
        category = db.query(GrievanceCategory).filter(GrievanceCategory.id == category_id).first()
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )


@router.post("/", response_model=AssignmentRuleOut, status_code=status.HTTP_201_CREATED)
def create_rule(
    payload: AssignmentRuleCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(allow_admin),
):
    """Create an assignment rule. Admin/DoM_Admin only."""
    _validate_targets(db, hierarchy_id=payload.hierarchy_id, category_id=payload.category_id)

    rule = AssignmentRule(
        category_id=payload.category_id,
        hierarchy_id=payload.hierarchy_id,
        is_default=payload.is_default,
        priority_order=payload.priority_order,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/", response_model=list[AssignmentRuleOut])
def list_rules(
    db: Session = Depends(get_db),
    _current_user: User = Depends(allow_admin),
):
    """List all assignment rules, ordered as the engine evaluates them."""
    return (
        db.query(AssignmentRule)
        .order_by(AssignmentRule.priority_order.asc(), AssignmentRule.id.asc())
        .all()
    )


@router.put("/{rule_id}", response_model=AssignmentRuleOut)
def update_rule(
    rule_id: int,
    payload: AssignmentRuleUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(allow_admin),
):
    """Update an assignment rule. Admin/DoM_Admin only.

    Uses `exclude_unset` so that omitting `category_id` leaves it unchanged,
    while explicitly sending `category_id: null` clears it to a wildcard.
    """
    rule = db.query(AssignmentRule).filter(AssignmentRule.id == rule_id).first()
    if rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment rule not found",
        )

    data = payload.model_dump(exclude_unset=True)
    _validate_targets(
        db,
        hierarchy_id=data.get("hierarchy_id"),
        category_id=data.get("category_id"),
    )

    for field, value in data.items():
        setattr(rule, field, value)

    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(allow_admin),
):
    """Delete an assignment rule. Admin/DoM_Admin only."""
    rule = db.query(AssignmentRule).filter(AssignmentRule.id == rule_id).first()
    if rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment rule not found",
        )

    db.delete(rule)
    db.commit()
