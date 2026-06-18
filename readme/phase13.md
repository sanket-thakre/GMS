## 📋 Phase 13: Ticket Fetching & Filtering Engine

- **Target Developer Assignment:** Stream 3: Officer Workspace (shared service — also powers the complainant list in Phase 12 and the dashboards in Phases 15 & 22).
- **Primary Objective:** Build a single, powerful, paginated `GET /tickets` endpoint with rich, role-aware query filters (status, category, subcategory, office, date range, priority, ownership) plus sorting.

### 🗂️ Target File Directory Architecture

**Backend**
- `backend/app/schemas/ticket.py` *(modify — add `TicketListItem`, `PaginatedTickets`, `TicketFilters`)*
- `backend/app/api/v1/endpoints/tickets.py` *(modify — add the list endpoint)*
- `backend/app/api/deps.py` *(optional — add a `get_pagination` helper dependency)*

**Frontend**
- `frontend/src/services/ticketService.js` *(modify — add `listTickets(params)`)*
- `frontend/src/components/Pagination.jsx` *(new — reusable pager)*
- `frontend/src/components/TicketFilters.jsx` *(new — reusable filter bar)*

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

Reuse `Ticket`, `GrievanceSubcategory` (for `category_id` join), `Hierarchy`, and `get_current_user`/`get_db`.

**Schemas (`app/schemas/ticket.py`):**
- `TicketListItem`: `id`, `ticket_number`, `status`, `priority`, `subcategory_id`, `assigned_hierarchy_id`, `complainant_id`, `created_at`, `due_date` (`from_attributes`). Optionally enrich with `subcategory_name`, `category_name`, `assigned_office_name` (populate via joins/relationships).
- `PaginatedTickets`: `items: list[TicketListItem]`, `total: int`, `page: int`, `page_size: int`, `total_pages: int`.

**Endpoint `GET /tickets` (auth: `Depends(get_current_user)`):** query params (all optional unless noted):
- `status: TicketStatus | None`
- `priority: TicketPriority | None`
- `category_id: int | None` (filter via join `GrievanceSubcategory.category_id`)
- `subcategory_id: int | None`
- `assigned_hierarchy_id: int | None`
- `mine: bool = False` (complainant's own tickets, `Ticket.complainant_id == current_user.id`)
- `date_from: datetime | None`, `date_to: datetime | None` (filter `created_at`)
- `search: str | None` (ILIKE on `ticket_number` / `description`)
- `sort_by: Literal["created_at","due_date","priority","status"] = "created_at"`, `order: Literal["asc","desc"] = "desc"`
- `page: int = 1` (ge=1), `page_size: int = 20` (ge=1, le=100)

**Role-aware default scoping (critical):** build the base query, then constrain by role *before* applying filters:
- `Complainant` → forced to `complainant_id == current_user.id` (ignore/ô­verride `assigned_hierarchy_id`); `mine` is implied.
- `APMC_Officer` / `DDR_Officer` → scope to tickets where `assigned_hierarchy_id == current_user.hierarchy_id` (and, if desired, descendant offices — keep simple: own office only here; descendant roll-up can be added later).
- `DoM_Admin` / `Admin` → no scoping; may see everything.

Apply pagination with `.offset((page-1)*page_size).limit(page_size)`; compute `total` with a `.count()` on the filtered query (before offset/limit); `total_pages = ceil(total/page_size)`.

This endpoint **supersedes** the temporary `mine=true` mock used in Phase 12.

### 🎨 Frontend Requirements (React & Tailwind)

- **ticketService.js:** `listTickets(params)` → `api.get("/tickets", { params })` returning `PaginatedTickets`.
- **TicketFilters.jsx:** A responsive filter bar (`flex flex-wrap gap-3 items-end`) with selects for Status, Priority, Category, and date inputs for `date_from`/`date_to`, plus a debounced search box. Emits a single `onChange(filters)` object. Include a "Clear" button.
- **Pagination.jsx:** Prev/Next buttons + "Page X of Y" + page-size selector; disabled states at bounds; emits `onPageChange`.
- **Integration:** consuming pages (Phase 15 officer list, Phase 12 my-list) keep `filters` + `page` in state, call `listTickets`, and render `items` into their table. Show a spinner while fetching and an empty-state row when `total === 0`.

### ⛓️ Decoupled/Mocking Protocol

Mock `GET /tickets?status=Open&page=1&page_size=20`:
```json
{
  "items": [
    { "id": 1, "ticket_number": "GMS-2026-000001", "status": "Open", "priority": "High", "subcategory_id": 10, "category_name": "Market Operations", "subcategory_name": "Weighbridge fraud", "assigned_hierarchy_id": 3, "assigned_office_name": "Pune APMC", "complainant_id": 5, "created_at": "2026-06-18T10:15:00Z", "due_date": "2026-06-18T22:15:00Z" }
  ],
  "total": 1, "page": 1, "page_size": 20, "total_pages": 1
}
```

### 🛡️ Verification & Testing Checklist

1. **Filtering** — `GET /tickets?status=Open&priority=High` returns only matching rows; add `date_from`/`date_to` and confirm the window is respected.
2. **Pagination math** — With >20 tickets, `page_size=5` returns 5 items and a correct `total_pages`; `page=2` returns the next slice with no overlap.
3. **Role scoping** — A `Complainant` calling `GET /tickets` (no `mine`) still sees only their own tickets; an `APMC_Officer` sees only their office's tickets; an `Admin` sees all.
4. **Sorting** — `sort_by=due_date&order=asc` returns the soonest-due ticket first.
