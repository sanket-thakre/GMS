import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class TicketStatus(str, enum.Enum):
    Open = "Open"
    In_Progress = "In_Progress"
    Escalated = "Escalated"
    Resolved = "Resolved"
    Closed = "Closed"


class TicketPriority(str, enum.Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"
    Critical = "Critical"


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(50), unique=True, nullable=False, index=True)
    complainant_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subcategory_id = Column(Integer, ForeignKey("grievance_subcategories.id"), nullable=False)
    assigned_hierarchy_id = Column(Integer, ForeignKey("hierarchies.id"), nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.Open, nullable=False)
    priority = Column(Enum(TicketPriority), default=TicketPriority.Medium, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)

    complainant = relationship("User", back_populates="filed_tickets", foreign_keys=[complainant_id])
    subcategory = relationship("GrievanceSubcategory", back_populates="tickets")
    assigned_hierarchy = relationship("Hierarchy", back_populates="assigned_tickets")
    audit_logs = relationship("AuditLog", back_populates="ticket")
