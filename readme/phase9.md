## 📋 Phase 9: User Hierarchy Management Module

- **Target Developer Assignment:** Stream 1: Automation (Admin / Setup foundation — produces the office tree that the Assignment & Escalation engines in Phases 14 & 17 depend on).
- **Primary Objective:** Build Admin-only APIs and a React admin screen to create the office/circle hierarchy (APMC → DDR → DoM) and assign officer users to a specific office.

### 🗂️ Target File Directory Architecture

**Backend**
- `backend/app/schemas/hierarchy.py` *(new)*
- `backend/app/api/v1/endpoints/hierarchies.py` *(new)*
- `backend/app/api/v1/endpoints/users.py` *(modify — add admin user-management routes)*
- `backend/app/schemas/user.py` *(modify — add `UserAdminUpdate`, `UserListItem`)*
- `backend/app/api/v1/router.py` *(modify — mount the hierarchies router)*

**Frontend**
- `frontend/src/pages/admin/HierarchyManagement.jsx` *(new)*
- `frontend/src/pages/admin/UserAssignment.jsx` *(new)*
- `frontend/src/services/hierarchyService.js` *(new)*
- `frontend/src/services/userService.js` *(new)*
- `frontend/src/App.jsx` *(modify — add protected admin routes)*
- `frontend/src/components/Navbar.jsx` *(modify — show "Admin" links when `user.role_name` is `Admin` or `DoM_Admin`)*

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

Reuse the existing `Hierarchy` model (`app/models/hierarchies.py`) — fields: `id`, `name` (String 200), `level` (Enum `HierarchyLevel`: `APMC, DML, PML, DDR, DoM`), `parent_id` (self-FK, nullable). Reuse `User` model fields `role_id` and the nullable `hierarchy_id`. Reuse `RoleChecker` and `get_db` from `app/api/deps.py`.

**Pydantic schemas (`app/schemas/hierarchy.py`):**
- `HierarchyBase`: `name: str`, `level: HierarchyLevel`, `parent_id: int | None = None`
- `HierarchyCreate(HierarchyBase)`
- `HierarchyUpdate`: all fields optional
- `HierarchyOut`: `id`, `name`, `level`, `parent_id`, plus `model_config = {"from_attributes": True}`
- `HierarchyTreeNode(HierarchyOut)`: `children: list["HierarchyTreeNode"] = []` (call `.model_rebuild()`)

Import `HierarchyLevel` from `app.models.hierarchies`.

**Endpoints (`app/api/v1/endpoints/hierarchies.py`, router prefix `/hierarchies`):** protect every write with `Depends(RoleChecker(["Admin", "DoM_Admin"]))`. Reads may use `Depends(get_current_user)`.
- `POST /` → create office. Validate `parent_id` exists if provided. Returns `HierarchyOut` (201).
- `GET /` → list all offices. Optional query param `level: HierarchyLevel | None` to filter. Returns `list[HierarchyOut]`.
- `GET /tree` → returns the nested `list[HierarchyTreeNode]` built from roots (`parent_id is None`) downward. Build in Python by grouping children by `parent_id`.
- `GET /{hierarchy_id}` → single office or 404.
- `PUT /{hierarchy_id}` → update name/level/parent. Reject if `parent_id == hierarchy_id` (a node cannot be its own parent) with 400.
- `DELETE /{hierarchy_id}` → 400 if it has children or assigned users; else delete.

**User-assignment routes (add to `app/api/v1/endpoints/users.py`):** protect with `Depends(RoleChecker(["Admin", "DoM_Admin"]))`.
- `GET /` → list all users. Optional query params `role: str | None`, `hierarchy_id: int | None`, `unassigned: bool = False` (filter `User.hierarchy_id.is_(None)`). Return `list[UserListItem]` (include `role_name` and `hierarchy_name` via the relationships).
- `PATCH /{user_id}/assign` → body `UserAdminUpdate { hierarchy_id: int | None, role_id: int | None }`. Update the user's office/role, commit, write an `AuditLog` row is **not** required here (no ticket), return updated `UserListItem`.

Mount in `app/api/v1/router.py`:
```python
from app.api.v1.endpoints import hierarchies
api_router.include_router(hierarchies.router, prefix="/hierarchies", tags=["hierarchies"])
```

After schema-affecting changes (none to tables here) no Alembic migration is needed — these are read/write endpoints over existing tables.

### 🎨 Frontend Requirements (React & Tailwind)

- **Services:** `hierarchyService.js` exports `listHierarchies`, `getTree`, `createHierarchy`, `updateHierarchy`, `deleteHierarchy` — all calling the shared Axios instance (`import api from "./api"`; e.g. `api.post("/hierarchies", payload)`). `userService.js` exports `listUsers(params)` and `assignUser(userId, payload)`.
- **HierarchyManagement.jsx:** Two-column responsive layout (`grid grid-cols-1 lg:grid-cols-2 gap-6`). Left: a **create-office form** card (`bg-white rounded-xl shadow p-6`) with inputs for `name`, a `<select>` for `level` (APMC/DML/PML/DDR/DoM), and a parent `<select>` populated from existing offices. Right: a **tree view** rendered recursively from `GET /hierarchies/tree`, indenting children with `pl-6 border-l`. Each node shows a level badge (`text-xs px-2 py-0.5 rounded` color-coded per level) and edit/delete buttons.
- **UserAssignment.jsx:** A responsive table (`min-w-full divide-y`) of users with columns Name, Email, Role, Current Office, Action. The Action column opens an inline office `<select>` + "Save" button that calls `assignUser`. Add a top filter bar with a "Show unassigned only" checkbox.
- **State:** `useState` for form fields and lists; `useEffect` to load on mount; a `loading` boolean driving a spinner (`animate-spin rounded-full border-4 border-blue-600 border-t-transparent`); a toast/alert `<div>` for success/error.
- **Routing:** wrap both pages in `<ProtectedRoute allowedRoles={["Admin", "DoM_Admin"]}>` inside `App.jsx` at paths `/admin/hierarchy` and `/admin/users`.

### ⛓️ Decoupled/Mocking Protocol

If the backend isn't ready, the frontend dev can mock `GET /hierarchies/tree`:
```json
[
  {
    "id": 1, "name": "Directorate of Marketing", "level": "DoM", "parent_id": null,
    "children": [
      {
        "id": 2, "name": "Pune DDR Office", "level": "DDR", "parent_id": 1,
        "children": [
          { "id": 3, "name": "Pune APMC", "level": "APMC", "parent_id": 2, "children": [] },
          { "id": 4, "name": "Hadapsar Private Market", "level": "PML", "parent_id": 2, "children": [] }
        ]
      }
    ]
  }
]
```
And `GET /users`:
```json
[
  { "id": 5, "full_name": "Asha Patil", "email": "asha@gms.gov", "role_name": "APMC_Officer", "hierarchy_id": null, "hierarchy_name": null }
]
```

### 🛡️ Verification & Testing Checklist

1. **Swagger (`/docs`)** — As an `Admin` token, `POST /hierarchies` to create a DoM root, then a DDR child (`parent_id` = DoM id), then an APMC child. `GET /hierarchies/tree` returns a 3-level nested structure.
2. **RBAC** — Call `POST /hierarchies` with a `Complainant` token → expect **403** `"Permission denied: Insufficient privileges"`.
3. **Assignment** — `PATCH /users/{id}/assign` with `{ "hierarchy_id": <APMC id> }` for an officer; re-fetch `GET /users?unassigned=true` and confirm that officer no longer appears.
4. **Browser** — Log in as Admin, open `/admin/hierarchy`, create an office via the form, and confirm it appears in the tree without a page refresh. Log in as a Complainant and confirm `/admin/hierarchy` redirects/blocks.
