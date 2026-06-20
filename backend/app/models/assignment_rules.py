from sqlalchemy import Column, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class AssignmentRule(Base):
    """Routing rule mapping a grievance category (or wildcard) to a target office.

    The assignment engine (Phase 14) evaluates rules by ascending `priority_order`
    (lower runs first). A rule with `category_id = NULL` and `is_default = True`
    acts as the catch-all when no category-specific rule matches.
    """

    __tablename__ = "assignment_rules"

    id = Column(Integer, primary_key=True, index=True)
    # NULL category_id = wildcard (used together with is_default for the catch-all).
    category_id = Column(Integer, ForeignKey("grievance_categories.id"), nullable=True)
    hierarchy_id = Column(Integer, ForeignKey("hierarchies.id"), nullable=False)
    is_default = Column(Boolean, nullable=False, default=False)
    priority_order = Column(Integer, nullable=False, default=100)

    category = relationship("GrievanceCategory")
    hierarchy = relationship("Hierarchy")
