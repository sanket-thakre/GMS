## 📋 Phase 17: Escalation Engine (Backend)

- **Target Developer Assignment:** Stream 1: Automation.
- **Primary Objective:** Run a scheduled background worker (Celery + Redis) that periodically scans for SLA-breached tickets and automatically escalates them up the office hierarchy (APMC/PML/DML → DDR → DoM), recomputing deadlines and writing audit logs.

### 🗂️ Target File Directory Architecture

**Backend**
- `backend/app/worker/__init__.py` *(new)*
- `backend/app/worker/celery_app.py` *(new — Celery instance + beat schedule)*
- `backend/app/worker/tasks.py` *(new — `sweep_sla_breaches` task)*
- `backend/app/services/escalation_engine.py` *(new — pure escalation logic, reused by Phase 18 manual path)*
- `backend/app/core/config.py` *(modify — add `REDIS_URL`, `CELERY_BROKER_URL`, `SLA_SWEEP_SECONDS`)*
- `backend/requirements.txt` *(modify — add `celery`, `redis`)*
- `backend/.env` *(modify — add `REDIS_URL`)*
- `docker-compose.yml` *(modify — add `redis`, `celery_worker`, `celery_beat` services)*

### ⚙️ Backend Requirements (FastAPI, Celery & SQLAlchemy)

Reuse `Ticket`, `TicketStatus` (`Escalated`), `Hierarchy` (self-referential `parent_id`), `AuditLog` (`action_type=Escalated`), `GrievanceSubcategory.sla_hours`, and `SessionLocal` from `app/db/session.py`.

**Config additions (`app/core/config.py`):**
- `REDIS_URL: str = "redis://localhost:6379/0"`
- `CELERY_BROKER_URL: str = "redis://localhost:6379/0"`, `CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"`
- `SLA_SWEEP_SECONDS: int = 300` (run the sweep every 5 min)

**Escalation service (`app/services/escalation_engine.py`):**
- `escalate_ticket(db, ticket, actor_user_id=None, reason="SLA breach") -> Ticket`:
  1. Resolve the current office (`Hierarchy` by `ticket.assigned_hierarchy_id`).
  2. Find its `parent_id`. If `parent_id is None` → already at the top (DoM); do **not** loop — mark/keep `Escalated` and log "escalation ceiling reached" (no reassignment).
  3. Reassign `ticket.assigned_hierarchy_id = parent.id`, set `ticket.status = TicketStatus.Escalated`.
  4. **Recompute a fresh due date** for the new tier: `due_date = now + timedelta(hours=subcategory.sla_hours)` (give the higher office a fresh SLA window; document this policy).
  5. Write `AuditLog`: `action_type=Escalated`, `previous_state=<old office name>`, `new_state=<new office name>`, `action_by_user_id=actor_user_id` (system escalations may use a designated system user id or leave the actor as the last officer — document the choice; simplest: a nullable actor is **not** allowed by the FK, so seed a `system` user and use its id).
  6. Commit; return ticket.
- Keep this function pure/synchronous so both the Celery task and the Phase 18 manual endpoint call it.

**Celery app (`app/worker/celery_app.py`):**
```python
from celery import Celery
from app.core.config import settings
celery = Celery("gms", broker=settings.CELERY_BROKER_URL, backend=settings.CELERY_RESULT_BACKEND)
celery.conf.beat_schedule = {
    "sla-sweep": {"task": "app.worker.tasks.sweep_sla_breaches", "schedule": float(settings.SLA_SWEEP_SECONDS)},
}
celery.conf.timezone = "UTC"
import app.worker.tasks  # noqa: ensure tasks are registered
```

**Task (`app/worker/tasks.py`):**
- `@celery.task(name="app.worker.tasks.sweep_sla_breaches")` `def sweep_sla_breaches():`
  - Open a `SessionLocal()`; query tickets where `due_date < now()` AND `status NOT IN (Resolved, Closed)`.
  - For each, call `escalate_ticket(...)`. Wrap each in try/except so one failure doesn't abort the batch; log counts.
  - Close the session in `finally`. Return a summary dict (escalated count) for observability.

**docker-compose additions** (compose v2; existing Postgres maps host `5433`):
```yaml
  redis:
    image: redis:7-alpine
    container_name: gms_redis
    ports: ["6379:6379"]
  celery_worker:
    build: ./backend
    command: celery -A app.worker.celery_app.celery worker --loglevel=info
    env_file: ./backend/.env
    depends_on: [redis, postgres]
  celery_beat:
    build: ./backend
    command: celery -A app.worker.celery_app.celery beat --loglevel=info
    env_file: ./backend/.env
    depends_on: [redis, postgres]
```
(The `build: ./backend` services depend on the backend Dockerfile from Phase 25; until then, run worker & beat locally: `celery -A app.worker.celery_app.celery worker -l info` and `... beat -l info` inside the venv.)

> **Important:** inside containers the DB host is `postgres:5432`, not `localhost:5433`. Ensure `.env` used by the worker points at the right host for its runtime context (compose network vs. local venv).

### 🎨 Frontend Requirements (React & Tailwind)

No new UI here (the **manual** trigger UI is Phase 18). The effect is observable in existing dashboards: escalated tickets show `status = Escalated` (amber `<StatusBadge>`) and a new assigned office.

### ⛓️ Decoupled/Mocking Protocol

There's no synchronous HTTP contract for the automated sweep. For local verification without waiting for beat, expose a guarded debug route (Admin-only) `POST /admin-test/run-sla-sweep` that calls `sweep_sla_breaches()` inline and returns:
```json
{ "checked": 12, "escalated": 3, "ceiling_reached": 1 }
```

### 🛡️ Verification & Testing Checklist

1. **Breach detection** — Insert a ticket with `due_date` in the past and status `Open`; run the sweep (via beat or the debug route); confirm its `assigned_hierarchy_id` moved to the parent office and `status = Escalated`.
2. **Audit + new SLA** — Confirm an `audit_logs` row with `action_type="Escalated"` (old→new office) and that `due_date` was refreshed for the new tier.
3. **Ceiling** — A ticket already at the DoM (root, `parent_id is None`) does not loop or error; it logs "ceiling reached" and is not reassigned.
4. **Resilience** — With several breached tickets where one is malformed, confirm the others still escalate (per-ticket try/except) and the worker logs the failure.
