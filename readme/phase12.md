## 📋 Phase 12: Complainant Web Portal Interface (Frontend)

- **Target Developer Assignment:** Stream 2: Complainant Portal.
- **Primary Objective:** Build the user-facing grievance submission form with cascading category → subcategory dropdowns, file attachment upload, and a "My Grievances" list, all wired to the Phase 11 API.

### 🗂️ Target File Directory Architecture

**Frontend**
- `frontend/src/pages/complainant/NewGrievance.jsx` *(new)*
- `frontend/src/pages/complainant/MyGrievances.jsx` *(new)*
- `frontend/src/pages/complainant/GrievanceDetail.jsx` *(new)*
- `frontend/src/services/ticketService.js` *(new or extend from Phase 11)*
- `frontend/src/services/categoryService.js` *(reuse from Phase 10)*
- `frontend/src/components/FileDropzone.jsx` *(new — reusable upload control)*
- `frontend/src/components/StatusBadge.jsx` *(new — reusable status pill)*
- `frontend/src/App.jsx` *(modify — add protected complainant routes)*
- `frontend/src/pages/Dashboard.jsx` *(modify — add quick links / role-aware landing)*

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

No new backend in this phase. Consumes existing endpoints:
- `GET /categories/with-subcategories` (Phase 10) for the cascading dropdown.
- `POST /tickets` (Phase 11, `multipart/form-data`) to lodge a grievance.
- `GET /tickets/{id}` (Phase 11) for the detail view.
- `GET /tickets?mine=true` (Phase 13) for "My Grievances" — until Phase 13 lands, use the mock below.

### 🎨 Frontend Requirements (React & Tailwind)

- **ticketService.js:** `createTicket(formData)` → `api.post("/tickets", formData)` (let Axios set the multipart boundary; do **not** hand-set Content-Type unless needed). `getTicket(id)`, `listMyTickets()` → `api.get("/tickets", { params: { mine: true } })`.
- **NewGrievance.jsx:**
  - Centered card form (`max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8`).
  - **Cascading dropdowns:** load `listWithSubs()` once on mount into `categories`. A category `<select>` sets `selectedCategoryId`; the subcategory `<select>` is derived from `categories.find(c => c.id === selectedCategoryId)?.subcategories` and is disabled until a category is chosen. When a subcategory is selected, show its `sla_hours` as a helper line ("Resolution target: 12 hours").
  - **Fields:** subcategory (required), `description` `<textarea>` (required, `rows={5}`), `priority` `<select>` (Low/Medium/High/Critical, default Medium), and the `FileDropzone`.
  - **Submit:** build a `FormData`, append `subcategory_id`, `description`, `priority`, and each file under key `files`; call `createTicket`; show a `submitting` spinner on the button; on success show a success card with the returned `ticket_number` and a "View grievance" link to `/grievances/:id`.
- **FileDropzone.jsx:** Tailwind dashed-border drop area (`border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400`), hidden `<input type="file" multiple accept="image/*,.pdf,.doc,.docx">`, and a chip list of selected files with a remove (×) button each. Expose value via `onFilesChange` callback prop.
- **StatusBadge.jsx:** maps status → Tailwind classes — `Open` gray, `In_Progress` blue, `Escalated` amber, `Resolved` green, `Closed` slate. Reused across complainant & officer views.
- **MyGrievances.jsx:** Responsive list/table (cards on mobile via `block md:table-row`). Columns: Ticket #, Subcategory, Status (`<StatusBadge>`), Created, Due. Empty state card ("You haven't filed any grievances yet" + CTA to `/grievances/new`). Loading spinner; error alert.
- **GrievanceDetail.jsx:** Header with ticket number + `<StatusBadge>`; a details grid; an attachments gallery (image thumbnails linking to `${API_ORIGIN}/static/uploads/...`); a placeholder section "Timeline" reserved for Phase 19.
- **Routing (App.jsx):** `<ProtectedRoute>` (any authenticated user) for `/grievances/new`, `/grievances` (my list), `/grievances/:id`.
- **State management:** local `useState`/`useEffect` per page; reuse `useAuth()` for the current user. No global store needed.

### ⛓️ Decoupled/Mocking Protocol

Mock `GET /tickets?mine=true`:
```json
[
  { "id": 1, "ticket_number": "GMS-2026-000001", "subcategory_id": 10, "status": "In_Progress", "priority": "High", "created_at": "2026-06-18T10:15:00Z", "due_date": "2026-06-18T22:15:00Z" },
  { "id": 2, "ticket_number": "GMS-2026-000002", "subcategory_id": 12, "status": "Open", "priority": "Medium", "created_at": "2026-06-17T09:00:00Z", "due_date": "2026-06-17T21:00:00Z" }
]
```

### 🛡️ Verification & Testing Checklist

1. **Cascading dropdown** — Selecting "Market Operations" populates only its subcategories; the subcategory select is disabled until a category is picked; choosing a subcategory shows the correct SLA helper text.
2. **End-to-end submit** — Fill the form, attach an image, submit; confirm the network tab shows a `multipart/form-data` POST, a 201 response, and the success card displays the real `ticket_number`.
3. **My Grievances** — After submitting, navigate to `/grievances`; confirm the new ticket appears with the correct `<StatusBadge>` color, and the empty state shows for a fresh account.
4. **Detail + attachment** — Open `/grievances/:id`; confirm the uploaded attachment thumbnail loads from `/static/uploads/...` and the page is unreachable when logged out (redirects to `/login`).
