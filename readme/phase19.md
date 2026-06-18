## 📋 Phase 19: Audit Logging System

- **Target Developer Assignment:** Stream 1: Automation (backend completeness) with a Stream 3 timeline view.
- **Primary Objective:** Guarantee that every lifecycle action writes an `audit_logs` row, and render a chronological "Ticket Timeline / History" in the detailed ticket views.

### 🗂️ Target File Directory Architecture

**Backend**
- `backend/app/services/audit.py` *(new — centralized `record_audit(...)` helper)*
- `backend/app/schemas/audit.py` *(new)*
- `backend/app/api/v1/endpoints/tickets.py` *(modify — add `GET /tickets/{id}/audit`; route all writes through `record_audit`)*
- *(refactor)* Phases 11/14/15/17/18 write paths to call `record_audit` instead of ad-hoc `AuditLog(...)`.

**Frontend**
- `frontend/src/components/TicketTimeline.jsx` *(new)*
- `frontend/src/pages/officer/TicketDetail.jsx` & `frontend/src/pages/complainant/GrievanceDetail.jsx` *(modify — mount the timeline)*
- `frontend/src/services/ticketService.js` *(modify — add `getAudit`)*

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

Reuse the existing `AuditLog` model (`ticket_id`, `action_by_user_id`, `action_type` Enum `ActionType: Created, Status_Changed, Escalated, Transferred, Resolved, Closed, Comment_Added`, `previous_state`, `new_state`, `timestamp`).

**Centralized helper (`app/services/audit.py`):**
- `record_audit(db, *, ticket_id, actor_user_id, action_type, previous_state=None, new_state=None, commit=False) -> AuditLog` — constructs and `db.add(...)`s the row; lets the caller control commit so it joins the same transaction as the state change (atomicity). Add it but **don't** double-commit.
- Refactor every place that currently builds `AuditLog(...)` (create, transfer, status update, escalate) to call this single helper so the audit contract is uniform.

**Schema (`app/schemas/audit.py`):** `AuditEntryOut`: `id`, `action_type`, `previous_state`, `new_state`, `timestamp`, `action_by_user_id`, plus a friendly `actor_name` (join `User.full_name`).

**Endpoint `GET /tickets/{ticket_id}/audit`** (auth: `Depends(get_current_user)`): authorization mirrors `GET /tickets/{id}` — complainant owner OR any officer/admin. Return `list[AuditEntryOut]` ordered by `timestamp ASC`. 404 if ticket missing, 403 if not permitted.

**Optional `Comment_Added`:** if you add a comment endpoint, route it through `record_audit` with `action_type=Comment_Added` and the comment text in `new_state`.

### 🎨 Frontend Requirements (React & Tailwind)

- **TicketTimeline.jsx:** Vertical timeline (`relative border-l-2 border-gray-200 pl-6 space-y-6`). Each entry: a colored node dot positioned on the line (color by `action_type` — Created gray, Status_Changed blue, Escalated amber, Transferred slate, Resolved green, Closed slate-700), the actor name, a human action label ("Status changed: Open → In Progress"), and a relative time ("2h ago", from `utils/time.js`). Render `previous_state → new_state` when both exist.
- **Integration:** call `getAudit(ticketId)` on detail mount; render `<TicketTimeline entries={...} />` in the reserved timeline panel of both `TicketDetail` (officer) and `GrievanceDetail` (complainant). Show a spinner while loading and an empty state ("No history yet").
- **Service:** `getAudit(id)` → `api.get(\`/tickets/${id}/audit\`)`.

### ⛓️ Decoupled/Mocking Protocol

Mock `GET /tickets/1/audit`:
```json
[
  { "id": 1, "action_type": "Created", "previous_state": null, "new_state": "Open", "timestamp": "2026-06-18T10:15:00Z", "action_by_user_id": 5, "actor_name": "Ramesh Kale" },
  { "id": 2, "action_type": "Status_Changed", "previous_state": "Open", "new_state": "In_Progress", "timestamp": "2026-06-18T12:40:00Z", "action_by_user_id": 8, "actor_name": "Asha Patil" },
  { "id": 3, "action_type": "Escalated", "previous_state": "Pune APMC", "new_state": "Pune DDR Office", "timestamp": "2026-06-18T22:20:00Z", "action_by_user_id": 1, "actor_name": "System" }
]
```

### 🛡️ Verification & Testing Checklist

1. **Total coverage** — Drive a ticket through create → in-progress → escalate → transfer → resolve; confirm `GET /tickets/{id}/audit` returns one ordered entry per action with correct actor and state transitions.
2. **Atomicity** — Force an error mid-status-update; confirm neither the status change nor its audit row persists (single transaction).
3. **Authorization** — A complainant can read their own ticket's audit; a different complainant gets **403**.
4. **Timeline UI** — Both detail pages render the timeline newest-at-bottom (ASC), with correct node colors and relative timestamps.
