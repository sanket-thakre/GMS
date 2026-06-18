## 📋 Phase 21: Reporting & Analytics API

- **Target Developer Assignment:** Stream 1: Automation.
- **Primary Objective:** Provide aggregate analytics endpoints (SQL `GROUP BY` queries) that report open/resolved counts, average resolution time, and SLA breaches by region/office/category for the executive dashboard.

### 🗂️ Target File Directory Architecture

**Backend**
- `backend/app/schemas/analytics.py` *(new)*
- `backend/app/services/analytics.py` *(new — aggregation queries)*
- `backend/app/api/v1/endpoints/analytics.py` *(new)*
- `backend/app/api/v1/router.py` *(modify — mount analytics router)*

**Frontend**
- `frontend/src/services/analyticsService.js` *(new)* — consumed by Phase 22.

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

Reuse `Ticket`, `TicketStatus`, `GrievanceSubcategory`/`GrievanceCategory`, `Hierarchy`, and the `resolved_at` column added in Phase 15. Use SQLAlchemy `func` (`func.count`, `func.avg`, `extract`) for aggregation. Protect all routes with `Depends(RoleChecker(["DoM_Admin","Admin"]))` (executive scope) — optionally allow `DDR_Officer` a region-scoped subset.

**Schemas (`app/schemas/analytics.py`):**
- `SummaryStats`: `total`, `open`, `in_progress`, `escalated`, `resolved`, `closed`, `breached`, `avg_resolution_hours: float | None`.
- `CountByKey`: `key: str`, `label: str`, `count: int` (generic for grouped bars).
- `BreachByOffice`: `hierarchy_id`, `office_name`, `level`, `total`, `breached`, `breach_rate: float`.
- `TrendPoint`: `date: str`, `created: int`, `resolved: int`.

**Service (`app/services/analytics.py`):**
- `get_summary(db, *, date_from=None, date_to=None) -> SummaryStats`: counts grouped by status via a single `GROUP BY status` query; `breached` = tickets with `due_date < now()` and status not in (Resolved, Closed); `avg_resolution_hours` via `func.avg(extract('epoch', Ticket.resolved_at - Ticket.created_at))/3600` filtered to resolved tickets.
- `counts_by_category(db)` → `list[CountByKey]` (`GROUP BY category`).
- `counts_by_status(db)` → `list[CountByKey]`.
- `breaches_by_office(db)` → `list[BreachByOffice]` (`GROUP BY hierarchy`, join `Hierarchy` for name/level, compute breach_rate in Python or SQL).
- `trend(db, *, days=30)` → `list[TrendPoint]` (`GROUP BY date(created_at)` for created; a parallel group on `resolved_at` for resolved; zero-fill missing days in Python).

**Endpoints (`app/api/v1/endpoints/analytics.py`, prefix `/analytics`):**
- `GET /summary?date_from&date_to` → `SummaryStats`.
- `GET /by-category` → `list[CountByKey]`.
- `GET /by-status` → `list[CountByKey]`.
- `GET /breaches-by-office` → `list[BreachByOffice]`.
- `GET /trend?days=30` → `list[TrendPoint]`.

Keep queries set-based (no Python loops over all tickets). Add DB indexes if needed (status, created_at already partially indexed; consider an index on `assigned_hierarchy_id`).

### 🎨 Frontend Requirements (React & Tailwind)

No visual components here (built in Phase 22). Deliver `analyticsService.js` with `getSummary(params)`, `getByCategory()`, `getByStatus()`, `getBreachesByOffice()`, `getTrend(days)` — all via the shared Axios instance.

### ⛓️ Decoupled/Mocking Protocol

Mock `GET /analytics/summary`:
```json
{ "total": 248, "open": 40, "in_progress": 70, "escalated": 18, "resolved": 100, "closed": 20, "breached": 12, "avg_resolution_hours": 17.4 }
```
Mock `GET /analytics/breaches-by-office`:
```json
[
  { "hierarchy_id": 3, "office_name": "Pune APMC", "level": "APMC", "total": 90, "breached": 8, "breach_rate": 0.089 },
  { "hierarchy_id": 2, "office_name": "Pune DDR Office", "level": "DDR", "total": 40, "breached": 2, "breach_rate": 0.05 }
]
```
Mock `GET /analytics/trend?days=7`:
```json
[
  { "date": "2026-06-12", "created": 12, "resolved": 9 },
  { "date": "2026-06-13", "created": 15, "resolved": 11 }
]
```

### 🛡️ Verification & Testing Checklist

1. **Summary accuracy** — Seed a known set of tickets; confirm `GET /analytics/summary` status counts match hand-computed totals and `breached` matches overdue/unresolved tickets.
2. **Avg resolution** — Resolve two tickets with known durations; confirm `avg_resolution_hours` equals their mean.
3. **Grouping** — `GET /analytics/by-category` and `/breaches-by-office` return one row per group with correct counts and `breach_rate`.
4. **RBAC** — A `Complainant` or plain officer hitting `/analytics/summary` gets **403**; a `DoM_Admin` gets data.
