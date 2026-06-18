## 📋 Phase 22: Executive Dashboard (React)

- **Target Developer Assignment:** Stream 3: Officer Workspace (executive tier — Director of Marketing).
- **Primary Objective:** Build a DoM-facing analytics dashboard using **Recharts** that visualizes system-wide health and pendency metrics from the Phase 21 endpoints.

### 🗂️ Target File Directory Architecture

**Frontend**
- `frontend/src/pages/executive/ExecutiveDashboard.jsx` *(new)*
- `frontend/src/components/charts/StatusPieChart.jsx` *(new)*
- `frontend/src/components/charts/CategoryBarChart.jsx` *(new)*
- `frontend/src/components/charts/TrendLineChart.jsx` *(new)*
- `frontend/src/components/charts/BreachByOfficeChart.jsx` *(new)*
- `frontend/src/components/StatCard.jsx` *(new — KPI tile)*
- `frontend/src/services/analyticsService.js` *(reuse from Phase 21)*
- `frontend/src/App.jsx` *(modify — add `/executive` protected route)*
- `frontend/src/components/Navbar.jsx` *(modify — show "Executive" link for DoM_Admin/Admin)*
- `frontend/package.json` *(modify — add `recharts`)*

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

None new — consumes the Phase 21 analytics endpoints (`/analytics/summary`, `/by-category`, `/by-status`, `/breaches-by-office`, `/trend`). Ensure the DoM user's role (`DoM_Admin`) passes the `RoleChecker` on those routes.

### 🎨 Frontend Requirements (React & Tailwind)

- **Install:** `npm install recharts` in `frontend/`.
- **ExecutiveDashboard.jsx layout:**
  - Top KPI row: `grid grid-cols-2 md:grid-cols-4 gap-4` of `<StatCard>` tiles — Total, Open+In-Progress (Pending), Resolved, **SLA Breaches** (red accent). Each tile shows a big number, a label, and a subtle trend hint.
  - Charts grid: `grid grid-cols-1 lg:grid-cols-2 gap-6`:
    - `<StatusPieChart>` — Recharts `<PieChart>`/`<Pie>` of status distribution (colors aligned with `<StatusBadge>`).
    - `<CategoryBarChart>` — `<BarChart>` of tickets by category.
    - `<TrendLineChart>` — `<LineChart>` with two lines (created vs resolved) over the last 30 days; a days selector (7/30/90).
    - `<BreachByOfficeChart>` — horizontal `<BarChart>` of breach counts/rates per office, sorted worst-first.
  - Wrap each chart in a `<ResponsiveContainer width="100%" height={300}>` inside a `bg-white rounded-2xl shadow p-4` card with a title.
- **Data loading:** a single `useEffect` fires all `analyticsService` calls in parallel (`Promise.all`), with a top-level `loading` spinner and an error alert; a date-range / days control re-triggers fetches.
- **Empty/zero states:** charts render a friendly "No data yet" placeholder when arrays are empty.
- **Routing:** `/executive` wrapped in `<ProtectedRoute allowedRoles={["DoM_Admin","Admin"]}>`. Add the nav link conditionally in `Navbar`.

### ⛓️ Decoupled/Mocking Protocol

Until Phase 21 is live, have `analyticsService` return the mocks from Phase 21 (summary, by-category, by-status, breaches-by-office, trend). Example `getByStatus()` mock:
```json
[
  { "key": "Open", "label": "Open", "count": 40 },
  { "key": "In_Progress", "label": "In Progress", "count": 70 },
  { "key": "Escalated", "label": "Escalated", "count": 18 },
  { "key": "Resolved", "label": "Resolved", "count": 100 },
  { "key": "Closed", "label": "Closed", "count": 20 }
]
```

### 🛡️ Verification & Testing Checklist

1. **KPIs** — Log in as `DoM_Admin`, open `/executive`; the four StatCards match `GET /analytics/summary` values.
2. **Charts render** — All four Recharts render with real data; the status pie colors match the `<StatusBadge>` palette; the trend chart shows two distinct lines.
3. **Interactivity** — Switching the trend range (7/30/90) refetches `/analytics/trend?days=` and redraws; tooltips show on hover.
4. **RBAC** — A `Complainant` or `APMC_Officer` navigating to `/executive` is redirected (ProtectedRoute), and the underlying analytics calls would return 403.
