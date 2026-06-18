## 📋 Phase 15: Officer Dashboard Interface

- **Target Developer Assignment:** Stream 3: Officer Workspace.
- **Primary Objective:** Build the React workspace where officers view their office's assigned tickets in a filterable table and open a detailed ticket view to update status (In Progress / Resolved / Closed).

### 🗂️ Target File Directory Architecture

**Backend**
- `backend/app/api/v1/endpoints/tickets.py` *(modify — add `PATCH /tickets/{id}/status`)*
- `backend/app/schemas/ticket.py` *(modify — add `TicketStatusUpdate`)*

**Frontend**
- `frontend/src/pages/officer/OfficerDashboard.jsx` *(new)*
- `frontend/src/pages/officer/TicketDetail.jsx` *(new — officer view, distinct from complainant `GrievanceDetail`)*
- `frontend/src/components/TicketTable.jsx` *(new — reusable)*
- `frontend/src/components/StatusUpdateControl.jsx` *(new)*
- `frontend/src/services/ticketService.js` *(modify — add `updateStatus`)*
- `frontend/src/App.jsx` *(modify — officer routes)*
- `frontend/src/components/Navbar.jsx` *(modify — officer links)*

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

Reuse `Ticket`, `TicketStatus` enum (`Open, In_Progress, Escalated, Resolved, Closed`), `AuditLog` (`action_type=Status_Changed/Resolved/Closed`), and `RoleChecker`/`get_current_user`.

**Schema:** `TicketStatusUpdate { status: TicketStatus, note: str | None = None }`.

**Endpoint `PATCH /tickets/{ticket_id}/status`** (auth: `Depends(RoleChecker(["APMC_Officer","DDR_Officer","DoM_Admin","Admin"]))`):
- Load ticket → 404 if missing.
- **Ownership:** a non-admin officer may only update tickets where `assigned_hierarchy_id == current_user.hierarchy_id` → else 403.
- **Allowed transitions (enforce):** `Open→In_Progress`, `In_Progress→Resolved`, `Resolved→Closed`, and `Resolved→In_Progress` (reopen). Reject illegal jumps with 400. (Escalation transitions are owned by Phases 17/18, not this endpoint.)
- Capture `previous_state = ticket.status.value`; set the new status; if status becomes `Resolved` set a `resolved_at` timestamp (add this nullable column to `Ticket` via a small Alembic migration if not present — used by Phase 21 avg-resolution metrics).
- Write `AuditLog`: choose `action_type` = `Resolved`/`Closed` when applicable else `Status_Changed`; store `previous_state`, `new_state`, optional `note` appended into `new_state` or a dedicated comment.
- Commit, return `TicketOut`.

### 🎨 Frontend Requirements (React & Tailwind)

- **OfficerDashboard.jsx:** Header with summary stat cards (`grid grid-cols-2 md:grid-cols-4 gap-4`) — counts of Open / In Progress / Escalated / Due-soon for the officer's office (derive from a `listTickets` call or the Phase 21 stats endpoint). Below, reuse `TicketFilters` (Phase 13) + `TicketTable` + `Pagination`. Default filter scope = the officer's office (the backend already scopes by role, so just call `listTickets({ page })`).
- **TicketTable.jsx:** Responsive table (`overflow-x-auto`), columns: Ticket #, Subcategory, Priority, Status (`<StatusBadge>`), Created, Due (with the Phase 16 SLA color dot), Action ("Open"). Row click → navigate to `/officer/tickets/:id`.
- **TicketDetail.jsx (officer):** Left column — full ticket info, complainant, description, attachments. Right column — a `StatusUpdateControl` card. Reserve a "Timeline" panel for Phase 19 and "Escalate/Transfer" buttons for Phase 18.
- **StatusUpdateControl.jsx:** a `<select>` constrained to legal next states (compute from current status), an optional note `<textarea>`, and a "Update status" button with a `submitting` spinner. On success, refetch the ticket and flash a success toast.
- **State:** local `useState`/`useEffect`; reuse `useAuth()` for `user.hierarchy_id`/`role_name`.
- **Routing:** `/officer` and `/officer/tickets/:id` wrapped in `<ProtectedRoute allowedRoles={["APMC_Officer","DDR_Officer","DoM_Admin","Admin"]}>`.

### ⛓️ Decoupled/Mocking Protocol

Mock `PATCH /tickets/1/status` (request `{ "status": "In_Progress" }`) response:
```json
{
  "id": 1, "ticket_number": "GMS-2026-000001", "status": "In_Progress", "priority": "High",
  "subcategory_id": 10, "assigned_hierarchy_id": 3, "complainant_id": 5,
  "created_at": "2026-06-18T10:15:00Z", "due_date": "2026-06-18T22:15:00Z", "resolved_at": null,
  "attachments": []
}
```

### 🛡️ Verification & Testing Checklist

1. **Status flow** — As the assigned office's officer, move a ticket `Open → In_Progress → Resolved`; confirm each write appears in `audit_logs` with correct `previous_state`/`new_state`.
2. **Illegal transition** — Attempt `Open → Closed` directly → expect **400**.
3. **Ownership** — An officer from a different office calling `PATCH /tickets/{id}/status` → **403**; an Admin succeeds.
4. **Browser** — On `/officer`, the stat cards and table render only the officer's office tickets; opening a ticket and updating status reflects immediately without a manual refresh.
