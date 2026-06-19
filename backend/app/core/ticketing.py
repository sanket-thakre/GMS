from datetime import datetime, timedelta, timezone
from pathlib import Path
from sqlalchemy.orm import Session
from app.models.tickets import Ticket

# Absolute path to backend/uploads (independent of the process working dir),
# shared by the tickets endpoint (writing files) and main.py (serving them).
BACKEND_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BACKEND_ROOT / "uploads"


def generate_ticket_number(db: Session) -> str:
    """Generate a unique ticket number in the form GMS-YYYY-NNNNNN.

    The numeric suffix is derived from the current ticket count. On the rare
    chance the resulting number already exists (concurrent inserts), keep
    incrementing the suffix until a free number is found.
    """
    year = datetime.now(timezone.utc).year
    seq = db.query(Ticket).count() + 1
    while True:
        candidate = f"GMS-{year}-{seq:06d}"
        exists = db.query(Ticket).filter(Ticket.ticket_number == candidate).first()
        if exists is None:
            return candidate
        seq += 1


def compute_due_date(created_at: datetime, sla_hours: int) -> datetime:
    """Return the SLA deadline: created_at + sla_hours."""
    return created_at + timedelta(hours=sla_hours)
