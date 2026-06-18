## 📋 Phase 18: Manual Escalation & Transfer UI

- **Target Developer Assignment:** Stream 3: Officer Workspace.
- **Primary Objective:** Give officers UI controls to manually escalate a ticket up the hierarchy or transfer it to another office when it's outside their jurisdiction, reusing the Phase 14 transfer and Phase 17 escalation logic.

### 🗂️ Target File Directory Architecture

**Backend**
- `backend/app/api/v1/endpoints/tickets.py` *(modify — add `POST /tickets/{id}/escalate`)*
- `backend/app/schemas/ticket.py` *(modify — add `EscalateRequest`)*

**Frontend**
- `frontend/src/components/EscalateModal.jsx` *(new)*
- `frontend/src/components/TransferModal.jsx` *(new)*
- `frontend/src/pages/officer/TicketDetail.jsx` *(modify — wire Escalate/Transfer buttons)*
- `frontend/src/services/ticketService.js` *(modify — add `escalateTicket`)*
- `frontend/src/services/assignmentService.js` *(reuse `transferTicket` from Phase 14)*

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

Reuse `escalate_ticket` (Phase 17 `app/services/escalation_engine.py`) and `reassign` (Phase 14 `app/services/assignment_engine.py`). Reuse `RoleChecker`/`get_current_user`.

**Schema:** `EscalateRequest { reason: str }` (require a justification for manual escalation).

**Endpoint `POST /tickets/{ticket_id}/escalate`** (auth: `Depends(RoleChecker(["APMC_Officer","DDR_Officer","DoM_Admin","Admin"]))`):
- Load ticket → 404 if missing.
- **Ownership:** non-admin officer may only escalate tickets in their own office (`assigned_hierarchy_id == current_user.hierarchy_id`) → else 403.
- Call `escalate_ticket(db, ticket, actor_user_id=current_user.id, reason=body.reason)`. The audit row's `action_type=Escalated` with the supplied reason captured in `new_state`/note.
- Return updated `TicketOut`. (Transfer already exists from Phase 14: `POST /tickets/{id}/transfer`.)

### 🎨 Frontend Requirements (React & Tailwind)

- **EscalateModal.jsx:** A Tailwind modal (`fixed inset-0 bg-black/40 flex items-center justify-center`, card `bg-white rounded-2xl p-6 max-w-md w-full`). Shows the current office and the computed next office ("Will escalate to: **Pune DDR Office**"), a required `reason` `<textarea>`, Cancel + "Escalate" buttons. Disable submit until reason is non-empty; show a spinner while posting.
- **TransferModal.jsx:** Similar shell, but with an office `<select>` (loaded from `GET /hierarchies`) and an optional reason. Calls `transferTicket(ticketId, { hierarchy_id, reason })`.
- **TicketDetail.jsx (officer):** Add an "Actions" panel with two buttons — "Escalate" (amber) and "Transfer" (slate) — that open the respective modals. After a successful action, close the modal, refetch the ticket, and flash a success toast; the `<StatusBadge>` and assigned-office line update to reflect the change.
- **Guarding:** hide both buttons if the ticket is `Resolved`/`Closed`, or if the current user isn't the assigned office's officer (and isn't Admin/DoM).
- **Service:** `escalateTicket(id, payload)` → `api.post(\`/tickets/${id}/escalate\`, payload)`.

### ⛓️ Decoupled/Mocking Protocol

Mock `POST /tickets/1/escalate` (request `{ "reason": "Outside APMC jurisdiction" }`) response:
```json
{
  "id": 1, "ticket_number": "GMS-2026-000001", "status": "Escalated", "priority": "High",
  "assigned_hierarchy_id": 2, "subcategory_id": 10, "complainant_id": 5,
  "created_at": "2026-06-18T10:15:00Z", "due_date": "2026-06-19T10:30:00Z", "attachments": []
}
```

### 🛡️ Verification & Testing Checklist

1. **Manual escalate** — As the assigned APMC officer, escalate with a reason; confirm the ticket moves to the parent (DDR) office, status becomes `Escalated`, and an `audit_logs` row records the reason.
2. **RBAC/ownership** — An officer from another office sees no Escalate/Transfer buttons, and a direct API call returns **403**.
3. **Transfer path** — Use the Transfer modal to move a ticket to a sibling office; confirm `assigned_hierarchy_id` changes and a `Transferred` audit row is written.
4. **UI guards** — Buttons are hidden for `Resolved`/`Closed` tickets; submitting with an empty reason is blocked client-side.
