from pydantic import BaseModel, Field


# ── Subcategory Schemas ──────────────────────────────────────────────

class SubcategoryBase(BaseModel):
    name: str
    sla_hours: int = Field(gt=0, description="SLA deadline in hours (must be > 0)")


class SubcategoryCreate(SubcategoryBase):
    category_id: int


class SubcategoryUpdate(BaseModel):
    name: str | None = None
    sla_hours: int | None = Field(default=None, gt=0)
    category_id: int | None = None


class SubcategoryOut(BaseModel):
    id: int
    name: str
    category_id: int
    sla_hours: int

    model_config = {"from_attributes": True}


# ── Category Schemas ─────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: str | None = None


class CategoryOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class CategoryWithSubsOut(CategoryOut):
    subcategories: list[SubcategoryOut] = []
