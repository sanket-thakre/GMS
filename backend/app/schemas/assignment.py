from pydantic import BaseModel, Field


# ── Assignment Rule Schemas ──────────────────────────────────────────

class AssignmentRuleBase(BaseModel):
    # NULL category_id = wildcard; pair with is_default=True for the catch-all.
    category_id: int | None = None
    hierarchy_id: int
    is_default: bool = False
    priority_order: int = Field(default=100, description="Lower is evaluated first")


class AssignmentRuleCreate(AssignmentRuleBase):
    pass


class AssignmentRuleUpdate(BaseModel):
    category_id: int | None = None
    hierarchy_id: int | None = None
    is_default: bool | None = None
    priority_order: int | None = None


class AssignmentRuleOut(AssignmentRuleBase):
    id: int

    model_config = {"from_attributes": True}


# ── Manual Transfer ──────────────────────────────────────────────────

class TicketTransfer(BaseModel):
    hierarchy_id: int
    reason: str | None = None
