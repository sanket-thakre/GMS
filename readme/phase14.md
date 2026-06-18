## 📋 Phase 14: Assignment Engine Logic

- **Target Developer Assignment:** Stream 1: Automation.
- **Primary Objective:** Auto-route every newly created ticket to the correct office based on rules (category + complainant/office context), and expose admin endpoints for manual transfer/re-assignment — every routing decision written to the audit log.

### 🗂️ Target File Directory Architecture

**Backend**
- `backend/app/models/assignment_rules.py` *(new — `AssignmentRule` model)*
- `backend/app/db/base.py` & `backend/app/models/__init__.py` *(modify — register model)*
- `backend/app/schemas/assignment.py` *(new)*
- `backend/app/services/assignment_engine.py` *(new — pure routing logic)*
- `backend/app/api/v1/endpoints/tickets.py` *(modify — call the engine on create; add transfer endpoint)*
- `backend/app/api/v1/endpoints/assignment_rules.py` *(new — admin CRUD for rules)*
- `backend/app/api/v1/router.py` *(modify)*
- `backend/alembic/versions/xxxx_add_assignment_rules.py` *(generated)*

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

**New model `AssignmentRule` (`app/models/assignment_rules.py`):**
- `id` PK, `category_id` FK→`grievance_categories.id` (nullable = wildcard), `hierarchy_id` FK→`hierarchies.id` (target office), `is_default` Boolean default False, `priority_order` Integer default 100 (lower = evaluated first).
- Relationships to `GrievanceCategory` and `Hierarchy`. Register in `base.py`/`__init__.py`; autogenerate + `alembic upgrade head`.

**Service (`app/services/assignment_engine.py`):**
- `resolve_office(db, *, subcategory_id, complainant) -> Hierarchy`:
  1. Look up the ticket's `category_id` via the subcategory.
  2. Find matching `AssignmentRule` rows ordered by `priority_order`; prefer a rule whose `category_id` matches, else a `is_default=True` rule.
  3. If the complainant has a `hierarchy_id`, you may bias toward the same geographic branch (optional refinement — document but keep deterministic).
  4. Return the resolved `Hierarchy`; raise a clear `ValueError` if nothing resolves and no default exists (caller maps to HTTP 409 with a "no assignment rule configured" message).
- `reassign(db, ticket, new_hierarchy_id, actor) -> Ticket`: updates `assigned_hierarchy_id`, writes an `AuditLog` row (`action_type=Transferred`, `previous_state=<old office name>`, `new_state=<new office name>`, `action_by_user_id=actor.id`), commits.

**Wire into ticket creation (Phase 11 `POST /tickets`):** replace the `# TODO(phase14)` placeholder with `office = resolve_office(...)` and set `assigned_hierarchy_id = office.id`. Keep the `Created` audit row; optionally add an `Assigned`-style note (reuse `action_type=Transferred` with `previous_state=None`).

**Endpoints:**
- `POST /tickets/{ticket_id}/transfer` (auth: `Depends(RoleChecker(["Admin","DoM_Admin","DDR_Officer","APMC_Officer"]))`) — body `{ "hierarchy_id": int, "reason": str | None }`. Calls `reassign`; an officer may only transfer tickets currently in their own office (enforce in handler) — Admin/DoM may transfer any. Returns updated `TicketOut`.
- Admin rule CRUD (`app/api/v1/endpoints/assignment_rules.py`, prefix `/assignment-rules`, `Depends(RoleChecker(["Admin","DoM_Admin"]))`): `POST /`, `GET /`, `PUT /{id}`, `DELETE /{id}` over `AssignmentRule`.

Mount both routers in `app/api/v1/router.py`.

### 🎨 Frontend Requirements (React & Tailwind)

This phase is backend-centric; the manual-transfer **UI** is delivered in Phase 18. Optionally add an admin "Assignment Rules" management page later. For now expose service stubs:
- `frontend/src/services/assignmentService.js`: `listRules()`, `createRule(payload)`, `transferTicket(ticketId, payload)` via the shared Axios instance.

### ⛓️ Decoupled/Mocking Protocol

Mock `POST /tickets/{id}/transfer` response:
```json
{
  "id": 1, "ticket_number": "GMS-2026-000001", "status": "Open", "priority": "High",
  "assigned_hierarchy_id": 7, "subcategory_id": 10, "complainant_id": 5,
  "created_at": "2026-06-18T10:15:00Z", "due_date": "2026-06-18T22:15:00Z",
  "attachments": []
}
```
Mock `GET /assignment-rules`:
```json
[
  { "id": 1, "category_id": 1, "hierarchy_id": 3, "is_default": false, "priority_order": 10 },
  { "id": 2, "category_id": null, "hierarchy_id": 3, "is_default": true, "priority_order": 100 }
]
```

### 🛡️ Verification & Testing Checklist

1. **Auto-route on create** — Configure a rule (`category_id` = Market Operations → Pune APMC). `POST /tickets` with a Market-Operations subcategory; confirm the new ticket's `assigned_hierarchy_id` equals Pune APMC.
2. **Default fallback** — Submit a ticket for a category with no specific rule; confirm it lands on the `is_default` office, and a missing-default scenario returns a clean **409**.
3. **Manual transfer + audit** — `POST /tickets/{id}/transfer` to another office; confirm `assigned_hierarchy_id` changed and a new `audit_logs` row exists with `action_type="Transferred"` and correct previous/new office names.
4. **Transfer RBAC** — An `APMC_Officer` transferring a ticket not in their office → **403**; an `Admin` transferring any ticket → **200**.
