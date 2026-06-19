from pydantic import BaseModel
from app.models.hierarchies import HierarchyLevel

class HierarchyBase(BaseModel):
    name: str
    level: HierarchyLevel
    parent_id: int | None = None

class HierarchyCreate(HierarchyBase):
    pass

class HierarchyUpdate(BaseModel):
    name: str | None = None
    level: HierarchyLevel | None = None
    parent_id: int | None = None

class HierarchyOut(HierarchyBase):
    id: int
    model_config = {"from_attributes": True}

class HierarchyTreeNode(HierarchyOut):
    children: list["HierarchyTreeNode"] = []

HierarchyTreeNode.model_rebuild()
