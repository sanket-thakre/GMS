from pydantic import BaseModel


class SummaryStats(BaseModel):
    total: int
    open: int
    in_progress: int
    escalated: int
    resolved: int
    closed: int
    breached: int
    avg_resolution_hours: float | None


class CountByKey(BaseModel):
    key: str
    label: str
    count: int


class BreachByOffice(BaseModel):
    hierarchy_id: int
    office_name: str
    level: str
    total: int
    breached: int
    breach_rate: float


class TrendPoint(BaseModel):
    date: str
    created: int
    resolved: int
