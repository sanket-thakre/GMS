# Phase 19: Audit Logging System

## Overview

Phase 19 centralizes the audit logging contract across the entire ticket lifecycle and renders a chronological **Activity Timeline** on both the officer and complainant ticket detail views. Every ticket mutation (create, status change, escalation, transfer, resolve, close) now flows through a single `record_audit()` helper, ensuring uniform audit coverage and transactional atomicity.

---

## Features Implemented

### 1. Centralized Audit Service (`record_audit`)

A new backend service module (`app/services/audit.py`) provides a single `record_audit()` function that all ticket lifecycle mutations call instead of constructing `AuditLog` instances directly.

**Key design decisions:**
- **Atomicity**: `commit=False` by default — the audit row is added to the session within the caller's transaction, so it either commits together with the state change or rolls back entirely. No orphan audit rows.
- **Flexibility**: Callers can pass `commit=True` for standalone audit operations (e.g., adding a comment).
- **Uniform contract**: All audit entries now go through the same code path, making it easy to add cross-cutting concerns (notifications, metrics) in the future.

### 2. Audit Trail API Endpoint

**`GET /api/v1/tickets/{ticket_id}/audit`** → `list[AuditEntryOut]`

- Returns the full audit trail ordered chronologically (oldest first / `timestamp ASC`)
- Authorization mirrors `GET /tickets/{id}`: the complainant who owns the ticket OR any staff member (officer/admin) may view the trail
- Includes `actor_name` (joined from `User.full_name`) for display
- Returns 404 for missing tickets, 403 for unauthorized access

### 3. Backend Refactoring

All 4 ad-hoc `AuditLog(...)` construction sites were refactored to use `record_audit()`:

| Location | Action Type | Change |
|---|---|---|
| `tickets.py` — `create_ticket()` | `Created` + `Transferred` | 2 calls refactored |
| `tickets.py` — `update_ticket_status()` | `Status_Changed` / `Resolved` / `Closed` | 1 call refactored |
| `assignment_engine.py` — `reassign()` | `Transferred` | 1 call refactored |
| `escalation_engine.py` — `escalate_ticket()` | `Escalated` | 1 call refactored |

### 4. TicketTimeline Component

A new reusable React component (`TicketTimeline.jsx`) renders a vertical timeline with:

- **Color-coded dots** per action type:
  | Action | Dot Color |
  |---|---|
  | Created | Gray |
  | Status_Changed | Blue |
  | Escalated | Amber |
  | Transferred | Slate |
  | Resolved | Green |
  | Closed | Dark Slate |
  | Comment_Added | Purple |

- **Human-readable labels**: e.g., "Status changed: Open → In Progress"
- **Note/reason extraction**: Displays appended notes in italics
- **Relative timestamps**: "2h ago", "3d ago", with full date on hover tooltip
- **Actor attribution**: Shows "by [Actor Name]" for each entry
- **Self-contained data fetching**: Takes `ticketId` prop and fetches audit trail on mount
- **Loading spinner** and **empty state** handling

### 5. Timeline Integration

The Phase 19 placeholder sections in both detail views were replaced with the real timeline:

- **Officer `TicketDetail.jsx`**: The dashed-border placeholder was replaced with a solid card containing the `<TicketTimeline>` component
- **Complainant `GrievanceDetail.jsx`**: The "will be available in a future update" placeholder was replaced with the live `<TicketTimeline>` component

---

## Files Created

| File | Description |
|---|---|
| `backend/app/services/audit.py` | Centralized `record_audit()` helper function |
| `backend/app/schemas/audit.py` | `AuditEntryOut` Pydantic schema with `actor_name` field |
| `frontend/src/components/TicketTimeline.jsx` | Vertical timeline component with color-coded entries |

## Files Modified

| File | Changes |
|---|---|
| `backend/app/api/v1/endpoints/tickets.py` | Added `GET /{id}/audit` endpoint; replaced 3 ad-hoc `AuditLog(...)` calls with `record_audit()` |
| `backend/app/services/assignment_engine.py` | Replaced `AuditLog(...)` in `reassign()` with `record_audit()` |
| `backend/app/services/escalation_engine.py` | Replaced `AuditLog(...)` in `escalate_ticket()` with `record_audit()` |
| `frontend/src/services/ticketService.js` | Added `getAuditTrail(id)` function |
| `frontend/src/pages/officer/TicketDetail.jsx` | Replaced Phase 19 placeholder with `<TicketTimeline>` |
| `frontend/src/pages/complainant/GrievanceDetail.jsx` | Replaced Phase 19 placeholder with `<TicketTimeline>` |

---

## API Reference

### `GET /api/v1/tickets/{ticket_id}/audit`

**Auth:** Bearer token (any authenticated user — ownership or staff role checked server-side)

**Response:** `200 OK` with `list[AuditEntryOut]`

```json
[
  {
    "id": 1,
    "action_type": "Created",
    "previous_state": null,
    "new_state": "Open",
    "timestamp": "2026-06-18T10:15:00Z",
    "action_by_user_id": 5,
    "actor_name": "Ramesh Kale"
  },
  {
    "id": 2,
    "action_type": "Status_Changed",
    "previous_state": "Open",
    "new_state": "In_Progress",
    "timestamp": "2026-06-18T12:40:00Z",
    "action_by_user_id": 8,
    "actor_name": "Asha Patil"
  }
]
```

**Error Responses:**
- `404 Not Found` — Ticket does not exist
- `403 Forbidden` — User is not the ticket owner and not a staff member

---

## How to Test

### Prerequisites
1. Backend running on port 4010 with PostgreSQL
2. At least one hierarchy node and category/subcategory configured
3. A registered user account with some existing tickets

### Test Steps

1. **Create a ticket** via `/grievances/new`
2. **Check the audit trail**: Navigate to `/grievances/{id}` → the Timeline section should show "Ticket created: Open" and "Transferred: [Office Name]"
3. **Change ticket status** (as an officer): Navigate to `/officer/tickets/{id}` → update status to "In Progress" → the timeline should show the new entry with the correct transition
4. **API verification**: Call `GET /api/v1/tickets/{id}/audit` directly from Swagger (`/docs`) — verify entries are ordered chronologically with `actor_name` populated
5. **Authorization check**: Try accessing another user's ticket audit trail — should return 403
6. **Atomicity check**: If a status update fails mid-transaction, verify neither the status change nor the audit row persist

---

## Architecture Diagram

```
┌─────────────────────────┐
│  tickets.py (create)    │──┐
│  tickets.py (status)    │  │    ┌──────────────────────┐
│  assignment_engine.py   │──┼───▶│  record_audit()      │───▶ audit_logs table
│  escalation_engine.py   │──┘    │  (app/services/audit) │
└─────────────────────────┘       └──────────────────────┘
                                           │
                                           ▼
                                  ┌──────────────────────┐
                                  │ GET /tickets/{id}/audit│
                                  │  → AuditEntryOut[]    │
                                  └──────────────────────┘
                                           │
                                           ▼
                              ┌────────────────────────────┐
                              │ <TicketTimeline ticketId/> │
                              │  (officer + complainant)   │
                              └────────────────────────────┘
```

---

## Dependencies on Future Phases

| Phase | Dependency |
|---|---|
| Phase 23 | UI/UX polish will add dark mode support and animations to the timeline |
| Phase 24 | System testing will add pytest coverage for the audit endpoint and `record_audit` |
