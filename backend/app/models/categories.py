from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class GrievanceCategory(Base):
    __tablename__ = "grievance_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, nullable=False)

    subcategories = relationship("GrievanceSubcategory", back_populates="category")


class GrievanceSubcategory(Base):
    __tablename__ = "grievance_subcategories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("grievance_categories.id"), nullable=False)
    sla_hours = Column(Integer, nullable=False)

    category = relationship("GrievanceCategory", back_populates="subcategories")
    tickets = relationship("Ticket", back_populates="subcategory")
