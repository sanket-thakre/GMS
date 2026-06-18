import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class HierarchyLevel(str, enum.Enum):
    APMC = "APMC"
    DML = "DML"
    PML = "PML"
    DDR = "DDR"
    DoM = "DoM"


class Hierarchy(Base):
    __tablename__ = "hierarchies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    level = Column(Enum(HierarchyLevel), nullable=False)
    parent_id = Column(Integer, ForeignKey("hierarchies.id"), nullable=True)

    parent = relationship("Hierarchy", remote_side=[id], back_populates="children")
    children = relationship("Hierarchy", back_populates="parent")
    users = relationship("User", back_populates="hierarchy")
    assigned_tickets = relationship("Ticket", back_populates="assigned_hierarchy")
