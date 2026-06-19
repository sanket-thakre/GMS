from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, RoleChecker
from app.models.hierarchies import Hierarchy, HierarchyLevel
from app.models.users import User
from app.schemas.hierarchy import HierarchyCreate, HierarchyUpdate, HierarchyOut, HierarchyTreeNode

router = APIRouter()

@router.get("", response_model=list[HierarchyOut])
def list_hierarchies(
    level: HierarchyLevel | None = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Hierarchy)
    if level:
        query = query.filter(Hierarchy.level == level)
    return query.all()

@router.post("", status_code=status.HTTP_201_CREATED, response_model=HierarchyOut)
def create_hierarchy(
    payload: HierarchyCreate,
    db: Session = Depends(get_db),
    current_user = Depends(RoleChecker(["Admin", "DoM_Admin"]))
):
    if payload.parent_id:
        parent = db.query(Hierarchy).filter(Hierarchy.id == payload.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent office not found")
    
    hierarchy = Hierarchy(**payload.model_dump())
    db.add(hierarchy)
    db.commit()
    db.refresh(hierarchy)
    return hierarchy

@router.get("/tree", response_model=list[HierarchyTreeNode])
def get_hierarchy_tree(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    all_nodes = db.query(Hierarchy).all()
    # Build nodes from scalar fields only. Do NOT use model_validate(from_attributes)
    # here: Hierarchy has a `children` relationship, so it would pre-populate each
    # node's children from the DB and the grouping loop below would append them a
    # second time, duplicating every child in the tree.
    nodes_dict = {
        n.id: HierarchyTreeNode(
            id=n.id, name=n.name, level=n.level, parent_id=n.parent_id, children=[]
        )
        for n in all_nodes
    }

    roots = []
    for n in all_nodes:
        node = nodes_dict[n.id]
        if n.parent_id is None:
            roots.append(node)
        else:
            parent = nodes_dict.get(n.parent_id)
            if parent:
                parent.children.append(node)
                
    return roots

@router.get("/{hierarchy_id}", response_model=HierarchyOut)
def get_hierarchy(
    hierarchy_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    hierarchy = db.query(Hierarchy).filter(Hierarchy.id == hierarchy_id).first()
    if not hierarchy:
        raise HTTPException(status_code=404, detail="Office not found")
    return hierarchy

@router.put("/{hierarchy_id}", response_model=HierarchyOut)
def update_hierarchy(
    hierarchy_id: int,
    payload: HierarchyUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(RoleChecker(["Admin", "DoM_Admin"]))
):
    hierarchy = db.query(Hierarchy).filter(Hierarchy.id == hierarchy_id).first()
    if not hierarchy:
        raise HTTPException(status_code=404, detail="Office not found")
    
    if payload.parent_id == hierarchy_id:
        raise HTTPException(status_code=400, detail="A node cannot be its own parent")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(hierarchy, key, value)
        
    db.commit()
    db.refresh(hierarchy)
    return hierarchy

@router.delete("/{hierarchy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hierarchy(
    hierarchy_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(RoleChecker(["Admin", "DoM_Admin"]))
):
    hierarchy = db.query(Hierarchy).filter(Hierarchy.id == hierarchy_id).first()
    if not hierarchy:
        raise HTTPException(status_code=404, detail="Office not found")
        
    if db.query(Hierarchy).filter(Hierarchy.parent_id == hierarchy_id).first():
        raise HTTPException(status_code=400, detail="Cannot delete office that has children")
        
    if db.query(User).filter(User.hierarchy_id == hierarchy_id).first():
         # User model is not imported yet in this file, fixing import below
         raise HTTPException(status_code=400, detail="Cannot delete office with assigned users")
         
    db.delete(hierarchy)
    db.commit()
    return None
