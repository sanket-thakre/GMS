# Grievance Management System (GMS)

A full-stack web application for managing agricultural grievances across APMC markets in India. The system routes complaints from farmers through a resolution hierarchy (APMC → DDR → DoM), enforces SLA deadlines, and provides officers with workspace tools and executives with analytics dashboards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI 0.x + Uvicorn, port **4010** |
| ORM / Migrations | SQLAlchemy + Alembic |
| Database | PostgreSQL 15 (Docker, host port **5433**) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Background Jobs | Celery + Redis (SLA sweep every 5 min) |
| Frontend | React 19 + Vite + React Router 7 |
| Styling | Tailwind CSS v4 |
| HTTP Client | Axios |
| Charts | Recharts |

---

## Project Structure

```
V1/
├── backend/
│   ├── app/
│   │   ├── api/v1/        # Route handlers
│   │   ├── core/          # Config, security, SLA utils
│   │   ├── db/            # Session, base model
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic (assignment, escalation, audit)
│   │   └── worker/        # Celery app + tasks
│   ├── alembic/           # DB migration scripts
│   ├── .env               # Local env vars (not committed)
│   ├── .env.example       # Template — copy to .env and fill in
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # AuthContext
│   │   ├── pages/         # complainant/, officer/, executive/, admin/
│   │   ├── services/      # Axios service modules
│   │   └── utils/
│   ├── .env.example       # Frontend env template
│   └── package.json
├── readme/                # Phase-by-phase implementation guides (phase9.md – phase25.md)
├── docker-compose.yml
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites

- Docker & Docker Compose
- Python 3.12+
- Node.js 20+

### 1. Database

```bash
docker compose up -d postgres
```

Postgres will be available at `localhost:5433`.

### 2. Backend

```bash
cd backend
python3 -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt

cp .env.example .env        # fill in secrets
alembic upgrade head        # run migrations
python3 -m app.main         # starts on port 4010
```

Health check: `curl http://localhost:4010/`

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # fill in if needed
npm run dev                 # starts on port 4000
```

Open `http://localhost:4000`

### 4. Background Workers (Celery)

```bash
# In separate terminals, with venv activated and from the backend/ directory:
celery -A app.worker.celery_app.celery worker --loglevel=info
celery -A app.worker.celery_app.celery beat   --loglevel=info
```

Requires Redis running. Add the `redis` service to docker compose or run `docker compose up -d redis`.

---

## Full Stack (Docker Compose)

> Phase 25 adds backend/frontend Dockerfiles. Until then, use the per-service steps above.

```bash
docker compose up --build
```

Services: `postgres` (5433), `redis` (6379), `backend` (4010), `celery_worker`, `celery_beat`, `frontend` (4000).

---

## API

- Interactive docs: `http://localhost:4010/docs`
- Base path: `/api/v1`
- Auth: `Authorization: Bearer <token>` (JWT, 60 min expiry)

Key endpoint groups:

| Prefix | Description |
|---|---|
| `/auth` | Register, login |
| `/users` | Profile, user management |
| `/tickets` | File, list, update, escalate, transfer |
| `/categories` | Grievance categories & subcategories |
| `/hierarchies` | Office hierarchy tree |
| `/assignment-rules` | Admin routing rules |
| `/analytics` | Summary, region, category, trends |

---

## Roles

| Role | Access |
|---|---|
| `Farmer` | File grievances, track own tickets |
| `APMC_Officer` | Manage own office's tickets |
| `DDR_Officer` | Manage DDR + child offices |
| `DoM_Admin` | System-wide officer access + analytics |
| `Admin` | Full system access |

---

## Resolution Hierarchy

```
Farmer → APMC / Private Market / DML
           ↓ (SLA breach or manual escalation)
         DDR Office
           ↓
         DoM (ceiling)
```

---

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for all variables with descriptions.

---

## Implementation Phases

Detailed per-phase specs live in `readme/`:

| Phase | Title | Stream |
|---|---|---|
| 9 | Admin Panel — Roles & Hierarchies | Stream 2 |
| 10 | Admin Panel — Users & Categories | Stream 2 |
| 11 | Ticket Creation API | Stream 1 |
| 12 | Complainant Grievance Portal | Stream 2 |
| 13 | Ticket Listing & Filtering API | Stream 1 |
| 14 | Assignment Engine | Stream 1 |
| 15 | Officer Dashboard | Stream 3 |
| 16 | SLA Monitoring | Stream 1 + 3 |
| 17 | Escalation Engine (Celery) | Stream 1 |
| 18 | Manual Escalation & Transfer UI | Stream 3 |
| 19 | Audit Logging System | Stream 1 + 3 |
| 20 | Notification Service (Email) | Stream 1 |
| 21 | Reporting & Analytics API | Stream 1 |
| 22 | Executive Dashboard (Recharts) | Stream 3 |
| 23 | UI/UX Refinement | Stream 2 + 3 |
| 24 | System Testing & Bug Fixing | All |
| 25 | Full System Dockerization | All |
