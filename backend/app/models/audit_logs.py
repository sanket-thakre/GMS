import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class ActionType(str, enum.Enum):
    Created = "Created"
    Status_Changed = "Status_Changed"
    Escalated = "Escalated"
    Transferred = "Transferred"
    Resolved = "Resolved"
    Closed = "Closed"
    Comment_Added = "Comment_Added"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    action_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action_type = Column(Enum(ActionType), nullable=False)
    previous_state = Column(String, nullable=True)
    new_state = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ticket = relationship("Ticket", back_populates="audit_logs")
    action_by_user = relationship("User", back_populates="audit_actions")
