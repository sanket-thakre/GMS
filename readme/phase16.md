## 📋 Phase 16: SLA Monitoring Implementation

- **Target Developer Assignment:** Stream 1: Automation (backend SLA math) with a Stream 3 visual layer.
- **Primary Objective:** Compute and expose each ticket's SLA standing relative to its `due_date`, and surface Red/Amber/Green urgency indicators throughout the React dashboards.

### 🗂️ Target File Directory Architecture

**Backend**
- `backend/app/core/sla.py` *(new — SLA status calculation)*
- `backend/app/schemas/ticket.py` *(modify — add `sla_status`, `time_remaining_seconds` to outputs)*
- `backend/app/api/v1/endpoints/tickets.py` *(modify — enrich list/detail responses)*

**Frontend**
- `frontend/src/components/SlaIndicator.jsx` *(new — colored dot + countdown)*
- `frontend/src/utils/time.js` *(new — `formatRemaining`, `humanizeDuration`)*
- `frontend/src/components/TicketTable.jsx` *(modify — render `<SlaIndicator>`)*

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

The `due_date` is already computed at creation (Phase 11: `created_at + sla_hours`). This phase derives a **status** from it.

**`app/core/sla.py`:**
- `SLA_STATUS = Literal["green","amber","red","breached"]`.
- `compute_sla(due_date, status, now=None) -> dict`:
  - If ticket `status in (Resolved, Closed)` → `{"sla_status": "green", "time_remaining_seconds": None}` (clock stopped).
  - `remaining = (due_date - now).total_seconds()`.
  - `remaining <= 0` → `breached`. Else compute fraction of total SLA window left; `> 50%` → `green`, `10–50%` → `amber`, `< 10%` → `red`. (Document the thresholds; keep them constants so they're tunable.)
  - Return `{"sla_status", "time_remaining_seconds": int(remaining)}`.
- Use timezone-aware `datetime.now(timezone.utc)`.

**Schema/endpoint changes:** add `sla_status: str` and `time_remaining_seconds: int | None` to `TicketListItem`/`TicketOut`, populated by calling `compute_sla(...)` when serializing (do it in the endpoint after the query, mapping each row → enriched dict, since it's a derived/non-column value). This keeps the DB clean — **do not** store `sla_status` (it's time-dependent).

> Note: actual *auto-escalation* on breach is Phase 17 (Celery). Phase 16 only reports standing.

### 🎨 Frontend Requirements (React & Tailwind)

- **utils/time.js:** `formatRemaining(seconds)` → "5h 12m left" / "Overdue by 2h"; `humanizeDuration(seconds)`.
- **SlaIndicator.jsx:** props `slaStatus`, `secondsRemaining`. Render a colored dot + label:
  - `green` → `bg-green-500`, `amber` → `bg-amber-500`, `red` → `bg-red-500 animate-pulse`, `breached` → `bg-red-700` with "Breached" text.
  - Show `formatRemaining` next to the dot. Wrap in `inline-flex items-center gap-2`.
- **Integration:** `TicketTable` (Phase 15) renders `<SlaIndicator slaStatus={t.sla_status} secondsRemaining={t.time_remaining_seconds} />` in the Due column. Officer/complainant dashboards thereby get instant urgency cues. Optionally add a client-side `setInterval` (e.g. every 60s) to re-derive labels without refetching.
- **Legend:** add a small legend chip row above tables explaining the colors.

### ⛓️ Decoupled/Mocking Protocol

Mock enriched ticket list item:
```json
{
  "id": 1, "ticket_number": "GMS-2026-000001", "status": "In_Progress", "priority": "High",
  "subcategory_id": 10, "assigned_hierarchy_id": 3, "complainant_id": 5,
  "created_at": "2026-06-18T10:15:00Z", "due_date": "2026-06-18T22:15:00Z",
  "sla_status": "amber", "time_remaining_seconds": 5400
}
```

### 🛡️ Verification & Testing Checklist

1. **Thresholds** — Create tickets with `due_date` far ahead (green), ~30% window left (amber), <10% left (red), and in the past (breached); confirm `GET /tickets` returns the correct `sla_status` for each.
2. **Clock stop** — Resolve a ticket; confirm its `sla_status` becomes `green` and `time_remaining_seconds` is `null` regardless of `due_date`.
3. **UI mapping** — In the officer table, confirm each `<SlaIndicator>` color matches the API `sla_status`, and "breached" rows show the pulsing red/"Breached" treatment.
4. **Live countdown** — Confirm the "x left" label decreases over time (interval refresh) without a full page reload.
