## 📋 Phase 23: UI/UX Refinement & Error Handling

- **Target Developer Assignment:** Cross-stream (Stream 2: Complainant Portal + Stream 3: Officer Workspace).
- **Primary Objective:** Standardize loading spinners, error/success toasts, empty states, and form validation across the entire React app so every screen behaves consistently and degrades gracefully.

### 🗂️ Target File Directory Architecture

**Frontend**
- `frontend/src/components/ui/Spinner.jsx` *(new)*
- `frontend/src/components/ui/Toast.jsx` & `frontend/src/context/ToastContext.jsx` *(new — global toast system)*
- `frontend/src/components/ui/EmptyState.jsx` *(new)*
- `frontend/src/components/ui/ErrorBoundary.jsx` *(new)*
- `frontend/src/components/ui/Button.jsx`, `Input.jsx`, `Select.jsx`, `Modal.jsx` *(new — shared primitives)*
- `frontend/src/utils/validators.js` *(new — email/required/min-length rules)*
- `frontend/src/services/api.js` *(modify — add a response interceptor for global 401/500 handling)*
- `frontend/src/main.jsx` *(modify — wrap app in `ToastProvider` + `ErrorBoundary`)*
- *(sweep)* refactor existing pages (Login, Register, NewGrievance, dashboards, modals) to use the shared primitives.

**Backend**
- `backend/app/main.py` *(modify — add a generic exception handler returning a consistent error envelope)*

### ⚙️ Backend Requirements (FastAPI & SQLAlchemy)

Reuse the existing `SQLAlchemyError` handler in `app/main.py`. Add:
- A `RequestValidationError` handler and a catch-all `Exception` handler that return a consistent JSON envelope `{ "detail": "<message>", "code": "<machine_code>" }` and log the stack trace via the existing `logging_config`. Never leak internal traces to clients (status 500 → generic message).
- Ensure all raised `HTTPException`s already use clear `detail` strings (audit the handlers from earlier phases).

### 🎨 Frontend Requirements (React & Tailwind)

- **ToastContext.jsx:** provides `useToast()` with `toast.success(msg)`, `toast.error(msg)`, `toast.info(msg)`. Render a stacked, auto-dismiss toast list fixed at `top-4 right-4` (`fixed z-50 space-y-2`), each `rounded-lg shadow-lg px-4 py-3` color-coded (green/red/blue) with a close button and a 4s timeout.
- **api.js response interceptor:** on `401` → clear `gms_token`/`gms_user` and redirect to `/login`; on `5xx` → surface a global error toast ("Something went wrong, please retry"); always reject so local `catch` blocks still run.
- **Shared primitives:** `Button` (variants primary/secondary/danger + `loading` prop rendering `<Spinner>` and disabling), `Input`/`Select` (label, error text, focus ring), `Modal` (backdrop + escape-to-close + focus trap), `EmptyState` (icon + message + optional CTA), `Spinner` (sizes).
- **validators.js + form refactor:** add `required`, `isEmail`, `minLength(n)` helpers; wire client-side validation into Login, Register, and NewGrievance — block submit and show inline field errors before calling the API.
- **ErrorBoundary.jsx:** class component that catches render errors and shows a friendly fallback with a "Reload" button, logging the error to console.
- **Consistency sweep:** replace ad-hoc spinners/alerts in all existing pages with the shared components; ensure every list page has an `<EmptyState>` and every async action shows loading + toast feedback.

### ⛓️ Decoupled/Mocking Protocol

This is a UI-hardening phase; no new API contract. To exercise error paths without a backend, temporarily stub `api` methods to `Promise.reject({ response: { status: 500, data: { detail: "Server error" } } })` and confirm the global error toast and interceptor fire. For 401 testing, reject with `status: 401` and confirm redirect-to-login + token clear.

### 🛡️ Verification & Testing Checklist

1. **Global 401** — With an expired/cleared token, any authenticated call triggers the response interceptor: token cleared and redirected to `/login`.
2. **Toasts** — Successful ticket submit shows a green toast; a forced 500 shows a red toast; both auto-dismiss after ~4s and stack correctly.
3. **Validation** — Submitting Register with an invalid email or empty required field shows inline errors and never hits the API.
4. **Empty & error states** — A user with zero tickets sees `<EmptyState>`; a thrown render error shows the `ErrorBoundary` fallback instead of a blank screen.
