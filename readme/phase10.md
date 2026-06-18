## 📋 Phase 10: Category & Subcategory Management

- **Target Developer Assignment:** Stream 1: Automation (Admin / Setup foundation — defines the SLA hours that drive Phase 16 SLA monitoring and Phase 17 escalation).
- **Primary Objective:** Provide full CRUD APIs and an Admin UI for grievance categories and their subcategories, where each subcategory carries the `sla_hours` deadline value.

### 🗂️ Target File Directory Architecture

**Backend**
- `backend/app/schemas/category.py` *(new)*
- `backend/app/api/v1/endpoints/categories.py` *(new)*
- `backend/app/api/v1/router.py` *(modify — mount categories router)*

**Frontend**
- `frontend/src/pages/admin/CategoryManagement.jsx` *(new)*
- `frontend/src/services/categoryService.js` *(new)*
- `frontend/src/App.jsx` *(modify — add `/admin/categories` protected route)*

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

Reuse models `GrievanceCategory` (`id`, `name` unique) and `GrievanceSubcategory` (`id`, `name`, `category_id` FK, `sla_hours` Integer) from `app/models/categories.py`. Reuse `RoleChecker`, `get_db`, `get_current_user` from `app/api/deps.py`.

**Pydantic schemas (`app/schemas/category.py`):**
- `SubcategoryBase`: `name: str`, `sla_hours: int = Field(gt=0)`
- `SubcategoryCreate(SubcategoryBase)`: `category_id: int`
- `SubcategoryUpdate`: optional `name`, `sla_hours`, `category_id`
- `SubcategoryOut`: `id`, `name`, `category_id`, `sla_hours` (`from_attributes`)
- `CategoryCreate`: `name: str`
- `CategoryUpdate`: optional `name`
- `CategoryOut`: `id`, `name` (`from_attributes`)
- `CategoryWithSubsOut(CategoryOut)`: `subcategories: list[SubcategoryOut] = []`

**Endpoints (`app/api/v1/endpoints/categories.py`, prefix `/categories`):** writes protected by `Depends(RoleChecker(["Admin", "DoM_Admin"]))`; reads by `Depends(get_current_user)` (complainants need to read these for the submission form in Phase 12).
- `POST /` → create category; 400 if name already exists.
- `GET /` → `list[CategoryOut]`.
- `GET /with-subcategories` → `list[CategoryWithSubsOut]` (eager-load via relationship; used by cascading dropdowns).
- `GET /{category_id}` → single or 404.
- `PUT /{category_id}` → rename.
- `DELETE /{category_id}` → 400 if it still has subcategories.
- `POST /{category_id}/subcategories` → create a subcategory under the category (validate category exists). Body `SubcategoryBase`.
- `GET /{category_id}/subcategories` → `list[SubcategoryOut]` for that category (used by the cascading dropdown in Phase 12).
- `PUT /subcategories/{subcategory_id}` → update name/sla_hours/category.
- `DELETE /subcategories/{subcategory_id}` → 400 if any ticket references it.

Mount in router:
```python
from app.api.v1.endpoints import categories
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
```

No new tables → no Alembic migration. Optionally write a small seed snippet documented in this README so the dev can insert a couple of demo categories.

### 🎨 Frontend Requirements (React & Tailwind)

- **categoryService.js:** `listCategories`, `listWithSubs`, `createCategory`, `updateCategory`, `deleteCategory`, `listSubcategories(categoryId)`, `createSubcategory(categoryId, payload)`, `updateSubcategory(id, payload)`, `deleteSubcategory(id)`.
- **CategoryManagement.jsx:** Master-detail layout. Left panel: list of categories as selectable cards (`hover:bg-gray-50 cursor-pointer`, active state `ring-2 ring-blue-500`). Right panel: subcategories of the selected category in a table with columns Name, **SLA (hours)**, Actions; plus an "Add subcategory" inline form (name input + number input for `sla_hours` with `min={1}`). Color the SLA cell: `≤12h` red badge, `13–24h` amber badge, `>24h` green badge to telegraph criticality.
- **State:** `categories`, `selectedCategoryId`, `subcategories`, `loading`, `error`. Re-fetch subcategories whenever `selectedCategoryId` changes (`useEffect` dependency).
- **Routing:** `/admin/categories` wrapped in `<ProtectedRoute allowedRoles={["Admin", "DoM_Admin"]}>`.

### ⛓️ Decoupled/Mocking Protocol

Mock for `GET /categories/with-subcategories`:
```json
[
  {
    "id": 1, "name": "Market Operations",
    "subcategories": [
      { "id": 10, "name": "Weighbridge fraud", "category_id": 1, "sla_hours": 12 },
      { "id": 11, "name": "License dispute", "category_id": 1, "sla_hours": 24 }
    ]
  },
  {
    "id": 2, "name": "Payment Issues",
    "subcategories": [
      { "id": 12, "name": "Delayed farmer payment", "category_id": 2, "sla_hours": 12 }
    ]
  }
]
```

### 🛡️ Verification & Testing Checklist

1. **Swagger** — As Admin, create a category, then `POST /categories/{id}/subcategories` with `{ "name": "Weighbridge fraud", "sla_hours": 12 }`. Confirm `GET /categories/with-subcategories` nests it.
2. **Validation** — `POST` a subcategory with `sla_hours: 0` → expect **422** (Pydantic `gt=0`). Create a duplicate category name → expect **400**.
3. **Referential safety** — Attempt to `DELETE` a category that still has subcategories → expect **400**.
4. **Browser** — On `/admin/categories`, select a category and add a subcategory with SLA 12; confirm the red criticality badge renders and the row appears immediately.
