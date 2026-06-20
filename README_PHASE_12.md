# Phase 12: Complainant Web Portal Interface

## Overview

Phase 12 implements the **user-facing grievance portal** — the core feature that allows complainants (farmers and other users) to file grievances, track their status, and view detailed information including attachments.

This is a **frontend-only** phase that consumes existing backend APIs from Phases 10, 11, and 13.

---

## Features Implemented

### 1. New Grievance Form (`/grievances/new`)

- **Cascading category → subcategory dropdowns**: Categories load on mount via `GET /categories/with-subcategories`. Selecting a category dynamically populates the subcategory dropdown. The subcategory dropdown is disabled until a category is chosen.
- **SLA helper text**: When a subcategory is selected, its SLA resolution target (e.g., "Resolution target: 12 hours") is displayed below the dropdown.
- **Description textarea**: Required field with 5 rows for detailed grievance description.
- **Priority selector**: Dropdown with Low, Medium (default), High, and Critical options.
- **File attachments**: Drag-and-drop file upload zone accepting images, PDFs, and Word documents. Shows a chip list of selected files with remove buttons.
- **Form submission**: Builds a `FormData` object and sends a `multipart/form-data` POST request to `POST /tickets/`. Displays a spinner during submission.
- **Success card**: On successful submission, shows a success card with the generated ticket number (e.g., `GMS-2026-000001`) and links to view the grievance or go to the grievances list.
- **Error handling**: Displays API error messages in a red alert banner.

### 2. My Grievances List (`/grievances`)

- **Responsive layout**: Table view on desktop (md+), card layout on mobile.
- **Columns/fields**: Ticket #, Category/Subcategory, Status (color-coded badge), Priority (color-coded text), Created date, Due date.
- **Empty state**: Friendly message with a CTA button to file the first grievance.
- **Pagination**: Previous/Next buttons with page indicator for large result sets.
- **Loading spinner**: Displayed while fetching data.
- **Error alert**: Shown if the API call fails.

### 3. Grievance Detail View (`/grievances/:id`)

- **Header**: Ticket number (monospace) and status badge.
- **Details grid**: Priority, Subcategory ID, Assigned Office ID, Due date (highlighted in red if overdue), Resolved date (if applicable).
- **Description**: Full grievance text in a styled block.
- **Attachments gallery**: Image thumbnails with hover zoom effect; non-image files shown as download cards with file icons. All link to `http://localhost:4010/static/uploads/...`.
- **Timeline placeholder**: Reserved section for Phase 19 audit trail integration.
- **Error handling**: Shows appropriate messages for 404 (not found) and 403 (permission denied).
- **Back link**: Navigation back to My Grievances.

### 4. Reusable Components

#### `StatusBadge.jsx`
Color-coded pill component for ticket statuses:
| Status | Color |
|---|---|
| Open | Gray |
| In_Progress | Blue |
| Escalated | Amber |
| Resolved | Green |
| Closed | Slate |

#### `FileDropzone.jsx`
Drag-and-drop file upload area with:
- Dashed border that highlights on drag-over
- Hidden file input (click or drag to activate)
- Accepts `image/*`, `.pdf`, `.doc`, `.docx`
- Chip list of selected files with file size and remove button
- Duplicate detection by name + size + lastModified
- `onFilesChange` callback prop

### 5. Dashboard Quick Links

The Dashboard page was enhanced with role-aware quick-link cards:
- **All users**: "File a Grievance" and "My Grievances" cards
- **Officers**: "Officer Dashboard" card
- **Admins**: "Manage Hierarchy" and "Manage Categories" cards

### 6. Navbar Updates

Added two new navigation links visible to all authenticated users:
- **File Grievance** → `/grievances/new`
- **My Grievances** → `/grievances`

---

## Files Created

| File | Description |
|---|---|
| `frontend/src/components/StatusBadge.jsx` | Reusable status pill with color mapping |
| `frontend/src/components/FileDropzone.jsx` | Drag-and-drop file upload component |
| `frontend/src/pages/complainant/NewGrievance.jsx` | Grievance submission form with cascading dropdowns |
| `frontend/src/pages/complainant/MyGrievances.jsx` | Paginated list of user's grievances |
| `frontend/src/pages/complainant/GrievanceDetail.jsx` | Detailed view with attachments gallery |

## Files Modified

| File | Changes |
|---|---|
| `frontend/src/services/ticketService.js` | Added `listMyTickets()` helper function |
| `frontend/src/App.jsx` | Added 3 protected routes: `/grievances/new`, `/grievances`, `/grievances/:id` |
| `frontend/src/components/Navbar.jsx` | Added "File Grievance" and "My Grievances" nav links for authenticated users |
| `frontend/src/pages/Dashboard.jsx` | Replaced placeholder with role-aware quick-link cards |

---

## Backend APIs Consumed

| Endpoint | Source Phase | Usage |
|---|---|---|
| `GET /api/v1/categories/with-subcategories` | Phase 10 | Cascading dropdown in NewGrievance |
| `POST /api/v1/tickets/` | Phase 11 | Submit new grievance (multipart/form-data) |
| `GET /api/v1/tickets/{id}` | Phase 11 | Load grievance detail |
| `GET /api/v1/tickets?mine=true` | Phase 13 | List user's own grievances |
| `GET /static/uploads/{file}` | Phase 11 (static mount) | Display attachment images/files |

---

## Routing

| Route | Component | Access |
|---|---|---|
| `/grievances/new` | `NewGrievance` | Any authenticated user |
| `/grievances` | `MyGrievances` | Any authenticated user |
| `/grievances/:id` | `GrievanceDetail` | Any authenticated user (backend enforces ownership) |

All routes are wrapped in `<ProtectedRoute>` without `allowedRoles`, meaning any logged-in user can access them. The backend enforces that complainants can only see their own tickets.

---

## How to Test

### Prerequisites
1. Backend running on port 4010 with PostgreSQL
2. At least one hierarchy node (APMC office) configured
3. At least one category with subcategories created via the Admin panel
4. A registered user account

### Test Steps

1. **Login** with any user account
2. **Dashboard**: Verify "File a Grievance" and "My Grievances" cards appear
3. **File a Grievance**:
   - Navigate to `/grievances/new`
   - Select a category → verify subcategory dropdown enables
   - Select a subcategory → verify SLA helper text appears
   - Enter a description, select priority, optionally attach files
   - Submit → verify spinner shows, then success card with ticket number
4. **My Grievances**:
   - Navigate to `/grievances` → verify new ticket appears in list
   - Verify status badge color matches ticket status
   - On mobile: verify card layout instead of table
   - With no tickets: verify empty state with CTA
5. **Grievance Detail**:
   - Click a ticket number → verify detail page loads
   - Verify all fields display correctly
   - If attachments were uploaded: verify image thumbnails load from `/static/uploads/`
   - Verify "Timeline" placeholder section exists
6. **Auth protection**: Log out → try navigating to `/grievances` → verify redirect to `/login`

---

## Known Limitations

- **Timeline section**: Placeholder only — will be populated with audit trail data in Phase 19.
- **Subcategory/Office names in detail view**: Currently displays IDs rather than names because `TicketOut` schema doesn't include joined names. This will improve when the detail endpoint is enhanced in future phases.
- **File size validation**: Client-side only (informational text). Server-side validation should be added if not already present.

---

## Dependencies on Future Phases

| Phase | Dependency |
|---|---|
| Phase 14 | Assignment Engine will improve office routing (currently uses default APMC office) |
| Phase 19 | Audit trail will populate the Timeline section in GrievanceDetail |
| Phase 23 | UI/UX polish will add dark mode, animations, and accessibility improvements |
