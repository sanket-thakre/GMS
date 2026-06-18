from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    hierarchy_id = Column(Integer, ForeignKey("hierarchies.id"), nullable=True)

    role = relationship("Role", back_populates="users")
    hierarchy = relationship("Hierarchy", back_populates="users")
    filed_tickets = relationship("Ticket", back_populates="complainant", foreign_keys="Ticket.complainant_id")
    audit_actions = relationship("AuditLog", back_populates="action_by_user")
