## 📋 Phase 24: System Testing & Bug Fixing

- **Target Developer Assignment:** All Streams (Integration & QA).
- **Primary Objective:** Validate the full critical path end-to-end — create user → create ticket → SLA breach → auto-escalation → audit log → notification — with automated tests and a documented manual QA script.

### 🗂️ Target File Directory Architecture

**Backend**
- `backend/tests/__init__.py` *(new)*
- `backend/tests/conftest.py` *(new — test DB, client, auth fixtures)*
- `backend/tests/test_auth.py`, `test_rbac.py`, `test_tickets.py`, `test_assignment.py`, `test_escalation.py`, `test_analytics.py` *(new)*
- `backend/requirements-dev.txt` *(new — `pytest`, `pytest-asyncio`, `httpx`, `factory-boy` optional)*
- `backend/pytest.ini` *(new)*

**Frontend**
- `frontend/src/__tests__/` *(new — optional Vitest + React Testing Library smoke tests)*
- `frontend/package.json` *(modify — add `vitest`, `@testing-library/react`)*

**Docs**
- `readme/QA_CHECKLIST.md` *(new — manual end-to-end script)*

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

- **conftest.py:** spin up a dedicated test database (separate DB name, e.g. `gms_test`, or a transactional rollback per test). Provide fixtures: `db_session`, `client` (FastAPI `TestClient`), and role-token factories (`complainant_token`, `apmc_officer_token`, `dom_admin_token`) that register+login via the real auth flow. Seed roles + a small hierarchy (DoM → DDR → APMC) and one category/subcategory (`sla_hours=12`).
- **Critical-path test (`test_escalation.py`):** create a complainant, create a ticket, **force the breach** by setting `due_date` to the past directly in the DB (don't sleep), invoke `sweep_sla_breaches()` synchronously, then assert: `assigned_hierarchy_id` advanced to the parent office, `status == "Escalated"`, and a new `audit_logs` row with `action_type == "Escalated"` exists. Mock the Celery email `.delay(...)` so no SMTP is attempted.
- **RBAC tests:** assert each protected route returns 403 for the wrong role and 200 for the right one (reuse the `RoleChecker` matrix).
- **Assignment tests:** rule match routes to the right office; default fallback; missing-default → 409.
- Run with `pytest -q`. Target the documented critical paths, not 100% coverage.

### 🎨 Frontend Requirements (React & Tailwind)

- Optional but recommended: Vitest smoke tests for `AuthContext` (login stores token), `ProtectedRoute` (redirects when unauthenticated), and the cascading dropdown in `NewGrievance`. Mock the Axios instance.
- Keep these lightweight; the primary QA gate is the backend critical-path test + the manual script.

### ⛓️ Decoupled/Mocking Protocol

Mock Celery so tests never touch Redis/SMTP: monkeypatch `send_email_task.delay` and (if testing the engine directly) call `sweep_sla_breaches()` in-process rather than through a broker. Example expected escalation assertion payload:
```json
{ "ticket_status_before": "Open", "ticket_status_after": "Escalated", "office_before": "Pune APMC", "office_after": "Pune DDR Office", "audit_action": "Escalated" }
```

### 🛡️ Verification & Testing Checklist

1. **Critical path (automated)** — `pytest backend/tests/test_escalation.py` passes: create → breach → sweep → escalated → audited, with email dispatch mocked.
2. **RBAC matrix (automated)** — `pytest backend/tests/test_rbac.py` confirms every protected endpoint enforces the correct roles (403/200).
3. **Manual smoke (browser)** — Follow `readme/QA_CHECKLIST.md`: register a complainant, file a ticket with an attachment, log in as the assigned officer, progress and resolve it, and confirm the timeline + SLA colors are correct.
4. **Regression sweep** — Re-run the full `pytest -q` suite green before sign-off; log and fix any flake (especially timezone/`due_date` math).
