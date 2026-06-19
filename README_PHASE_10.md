# 📋 Phase 10: Category & Subcategory Management

## Overview

Phase 10 implements full CRUD (Create, Read, Update, Delete) functionality for grievance categories and subcategories. Each subcategory carries an `sla_hours` field that defines the SLA deadline — this value drives the SLA monitoring (Phase 16) and automatic escalation (Phase 17) in later phases.

This phase delivers both **backend API endpoints** and an **admin frontend page** with a master-detail layout.

---

## Features Implemented

### Backend (FastAPI)

- **10 RESTful API endpoints** under `/api/v1/categories`:

  | # | Method | Path | Access | Description |
  |---|--------|------|--------|-------------|
  | 1 | `POST` | `/categories/` | Admin, DoM_Admin | Create a new category (400 on duplicate name) |
  | 2 | `GET` | `/categories/` | Any authenticated | List all categories |
  | 3 | `GET` | `/categories/with-subcategories` | Any authenticated | Categories with nested subcategories (eager-loaded) |
  | 4 | `GET` | `/categories/{category_id}` | Any authenticated | Get single category (404 if not found) |
  | 5 | `PUT` | `/categories/{category_id}` | Admin, DoM_Admin | Rename a category |
  | 6 | `DELETE` | `/categories/{category_id}` | Admin, DoM_Admin | Delete category (400 if has subcategories) |
  | 7 | `POST` | `/categories/{category_id}/subcategories` | Admin, DoM_Admin | Create subcategory under a category |
  | 8 | `GET` | `/categories/{category_id}/subcategories` | Any authenticated | List subcategories for a category |
  | 9 | `PUT` | `/categories/subcategories/{subcategory_id}` | Admin, DoM_Admin | Update subcategory name/SLA/category |
  | 10 | `DELETE` | `/categories/subcategories/{subcategory_id}` | Admin, DoM_Admin | Delete subcategory (400 if tickets reference it) |

- **8 Pydantic schemas** for request/response validation:
  - `SubcategoryBase`, `SubcategoryCreate`, `SubcategoryUpdate`, `SubcategoryOut`
  - `CategoryCreate`, `CategoryUpdate`, `CategoryOut`, `CategoryWithSubsOut`

- **Validation rules**:
  - `sla_hours` must be > 0 (Pydantic `Field(gt=0)`)
  - Duplicate category names return 400
  - Cannot delete a category that has subcategories (400)
  - Cannot delete a subcategory referenced by tickets (400)

### Frontend (React + Tailwind CSS)

- **CategoryManagement page** (`/admin/categories`) with master-detail layout:
  - **Left panel**: Category list with selectable cards, add/edit/delete functionality
  - **Right panel**: Subcategory table for the selected category with inline add/edit/delete
  - **SLA color badges**: ≤12h (red), 13–24h (amber), >24h (green)
  - Loading spinners, error/success alerts (auto-dismiss)
  - Keyboard shortcuts (Enter to save, Escape to cancel inline edits)

- **Category service module** with all API call functions

- **Admin navigation**: "Categories" link appears in the Navbar for Admin/DoM_Admin users

- **Route protection**: `/admin/categories` is wrapped in `ProtectedRoute` with `allowedRoles={["Admin", "DoM_Admin"]}`

---

## Technical Approach

### Architecture Decisions

1. **No new database tables or migrations** — reuses existing `GrievanceCategory` and `GrievanceSubcategory` models
2. **Eager loading** — `GET /with-subcategories` uses SQLAlchemy `joinedload` to avoid N+1 queries
3. **RBAC pattern** — Write operations use `RoleChecker(["Admin", "DoM_Admin"])`, reads use `get_current_user` (any authenticated user)
4. **Follows existing conventions** — same import patterns, file structure, and coding style as the auth endpoints

### Access Control

| Operation | Required Role |
|-----------|---------------|
| Create/Update/Delete categories | Admin, DoM_Admin |
| Create/Update/Delete subcategories | Admin, DoM_Admin |
| Read categories/subcategories | Any authenticated user |

Read access is kept open for all authenticated users because complainants need to read categories for the grievance submission form (Phase 12).

---

## File Changes

### New Files (4)

| File | Description |
|------|-------------|
| `backend/app/schemas/category.py` | Pydantic schemas for Category & Subcategory CRUD |
| `backend/app/api/v1/endpoints/categories.py` | 10 CRUD endpoints with RBAC and validation |
| `frontend/src/services/categoryService.js` | Axios service module for category API calls |
| `frontend/src/pages/admin/CategoryManagement.jsx` | Admin UI page with master-detail layout |

### Modified Files (3)

| File | Change |
|------|--------|
| `backend/app/api/v1/router.py` | Added `categories` router import and mount at `/categories` prefix |
| `frontend/src/App.jsx` | Added `/admin/categories` protected route for Admin/DoM_Admin |
| `frontend/src/components/Navbar.jsx` | Added "Categories" nav link visible to Admin/DoM_Admin users |

---

## Setup & Testing Instructions

### Prerequisites

- Backend server running on port 4010 (`python -m app.main`)
- PostgreSQL database with tables created (via `alembic upgrade head` or auto-create)
- Frontend dev server running on port 4000 (`npm run dev`)
- At least one user with "Admin" or "DoM_Admin" role registered in the system

### Testing via Swagger UI

1. Open `http://localhost:4010/docs`
2. Authenticate as Admin using `POST /api/v1/auth/login`
3. Copy the `access_token` and click "Authorize" (Bearer token)

**Test category CRUD:**
```
POST /api/v1/categories           → { "name": "Market Operations" }  → 201
POST /api/v1/categories           → { "name": "Payment Issues" }     → 201
GET  /api/v1/categories           → returns list of categories
PUT  /api/v1/categories/1         → { "name": "Market Ops" }         → 200
POST /api/v1/categories           → { "name": "Market Ops" }         → 400 (duplicate)
```

**Test subcategory CRUD:**
```
POST /api/v1/categories/1/subcategories → { "name": "Weighbridge fraud", "sla_hours": 12 } → 201
POST /api/v1/categories/1/subcategories → { "name": "License dispute", "sla_hours": 24 }   → 201
GET  /api/v1/categories/with-subcategories → returns nested structure
```

**Test validation:**
```
POST /api/v1/categories/1/subcategories → { "name": "Bad", "sla_hours": 0 }  → 422 (gt=0)
DELETE /api/v1/categories/1             → 400 (has subcategories)
```

### Testing via Browser

1. Log in as Admin at `http://localhost:4000/login`
2. Click "Categories" in the navbar
3. Create a category, select it, add subcategories with different SLA values
4. Verify SLA badges: 12h → red, 24h → amber, 48h → green
5. Test edit/delete operations
6. Log in as a Complainant — verify "Categories" link is hidden and `/admin/categories` shows 403

---

## Known Limitations & Future Improvements

1. **No pagination** — Category and subcategory lists are loaded in full. Adequate for expected volume (tens of categories) but may need pagination if the dataset grows significantly.
2. **No search/filter** — The current UI does not include search functionality for categories or subcategories.
3. **No bulk operations** — Categories and subcategories can only be created/edited one at a time.
4. **Phase 9 not yet implemented** — The hierarchy management module (Phase 9) is not yet built, but Phase 10 is fully independent of it.
5. **SLA hours stored on subcategory only** — The `sla_hours` field is on `GrievanceSubcategory`, not on `GrievanceCategory`. This is by design per the data model.

---

## Dependencies on Future Phases

- **Phase 12** (Complainant Portal) will use `GET /categories/with-subcategories` for cascading dropdowns in the grievance submission form.
- **Phase 16** (SLA Monitoring) will use `sla_hours` from subcategories to compute ticket deadlines.
- **Phase 17** (Escalation Engine) will use SLA deadlines derived from `sla_hours` to trigger automatic escalation.
