from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, get_current_user, RoleChecker
from app.models.categories import GrievanceCategory, GrievanceSubcategory
from app.models.tickets import Ticket
from app.models.users import User
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryOut,
    CategoryWithSubsOut,
    SubcategoryBase,
    SubcategoryUpdate,
    SubcategoryOut,
)

router = APIRouter()

# ── Access control dependencies ──────────────────────────────────────
allow_admin = RoleChecker(["Admin", "DoM_Admin"])


# ── Category Endpoints ───────────────────────────────────────────────

@router.post("/", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(allow_admin),
):
    """Create a new grievance category. Admin/DoM_Admin only."""
    existing = (
        db.query(GrievanceCategory)
        .filter(GrievanceCategory.name == payload.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{payload.name}' already exists",
        )

    category = GrievanceCategory(name=payload.name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/", response_model=list[CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """List all grievance categories. Any authenticated user."""
    return db.query(GrievanceCategory).order_by(GrievanceCategory.name).all()


@router.get("/with-subcategories", response_model=list[CategoryWithSubsOut])
def list_categories_with_subcategories(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """List all categories with nested subcategories (eager-loaded). Any authenticated user."""
    categories = (
        db.query(GrievanceCategory)
        .options(joinedload(GrievanceCategory.subcategories))
        .order_by(GrievanceCategory.name)
        .all()
    )
    return categories


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Get a single category by ID. Any authenticated user."""
    category = db.query(GrievanceCategory).filter(GrievanceCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    return category


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(allow_admin),
):
    """Rename a category. Admin/DoM_Admin only."""
    category = db.query(GrievanceCategory).filter(GrievanceCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    if payload.name is not None:
        # Check for duplicate name (exclude current category)
        duplicate = (
            db.query(GrievanceCategory)
            .filter(GrievanceCategory.name == payload.name, GrievanceCategory.id != category_id)
            .first()
        )
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category '{payload.name}' already exists",
            )
        category.name = payload.name

    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(allow_admin),
):
    """Delete a category. 400 if it still has subcategories. Admin/DoM_Admin only."""
    category = db.query(GrievanceCategory).filter(GrievanceCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Check for existing subcategories
    sub_count = (
        db.query(GrievanceSubcategory)
        .filter(GrievanceSubcategory.category_id == category_id)
        .count()
    )
    if sub_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category that still has subcategories. Remove all subcategories first.",
        )

    db.delete(category)
    db.commit()


# ── Subcategory Endpoints ────────────────────────────────────────────

@router.post(
    "/{category_id}/subcategories",
    response_model=SubcategoryOut,
    status_code=status.HTTP_201_CREATED,
)
def create_subcategory(
    category_id: int,
    payload: SubcategoryBase,
    db: Session = Depends(get_db),
    _current_user: User = Depends(allow_admin),
):
    """Create a subcategory under a category. Admin/DoM_Admin only."""
    # Validate category exists
    category = db.query(GrievanceCategory).filter(GrievanceCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    subcategory = GrievanceSubcategory(
        name=payload.name,
        sla_hours=payload.sla_hours,
        category_id=category_id,
    )
    db.add(subcategory)
    db.commit()
    db.refresh(subcategory)
    return subcategory


@router.get("/{category_id}/subcategories", response_model=list[SubcategoryOut])
def list_subcategories(
    category_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """List subcategories for a specific category. Any authenticated user."""
    # Validate category exists
    category = db.query(GrievanceCategory).filter(GrievanceCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    return (
        db.query(GrievanceSubcategory)
        .filter(GrievanceSubcategory.category_id == category_id)
        .order_by(GrievanceSubcategory.name)
        .all()
    )


@router.put("/subcategories/{subcategory_id}", response_model=SubcategoryOut)
def update_subcategory(
    subcategory_id: int,
    payload: SubcategoryUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(allow_admin),
):
    """Update a subcategory's name, SLA hours, or parent category. Admin/DoM_Admin only."""
    subcategory = (
        db.query(GrievanceSubcategory)
        .filter(GrievanceSubcategory.id == subcategory_id)
        .first()
    )
    if not subcategory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found",
        )

    if payload.name is not None:
        subcategory.name = payload.name

    if payload.sla_hours is not None:
        subcategory.sla_hours = payload.sla_hours

    if payload.category_id is not None:
        # Validate new category exists
        new_category = (
            db.query(GrievanceCategory)
            .filter(GrievanceCategory.id == payload.category_id)
            .first()
        )
        if not new_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target category not found",
            )
        subcategory.category_id = payload.category_id

    db.commit()
    db.refresh(subcategory)
    return subcategory


@router.delete("/subcategories/{subcategory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subcategory(
    subcategory_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(allow_admin),
):
    """Delete a subcategory. 400 if any ticket references it. Admin/DoM_Admin only."""
    subcategory = (
        db.query(GrievanceSubcategory)
        .filter(GrievanceSubcategory.id == subcategory_id)
        .first()
    )
    if not subcategory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found",
        )

    # Check for tickets referencing this subcategory
    ticket_count = (
        db.query(Ticket)
        .filter(Ticket.subcategory_id == subcategory_id)
        .count()
    )
    if ticket_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete subcategory: {ticket_count} ticket(s) reference it.",
        )

    db.delete(subcategory)
    db.commit()
