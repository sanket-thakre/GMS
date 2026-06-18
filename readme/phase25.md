## 📋 Phase 25: Full System Dockerization (Final Step)

- **Target Developer Assignment:** All Streams (DevOps / Release).
- **Primary Objective:** Containerize the FastAPI backend (Uvicorn/Gunicorn), the Celery worker & beat, and the React frontend (multi-stage build served by Nginx), and orchestrate everything — plus PostgreSQL and Redis — on one Docker network via `docker-compose`.

### 🗂️ Target File Directory Architecture

- `backend/Dockerfile` *(new — Python/Uvicorn image)*
- `backend/.dockerignore` *(new)*
- `backend/entrypoint.sh` *(new — run migrations then launch)*
- `frontend/Dockerfile` *(new — multi-stage Node build → Nginx)*
- `frontend/nginx.conf` *(new — SPA fallback + API proxy)*
- `frontend/.dockerignore` *(new)*
- `docker-compose.yml` *(modify — promote to the full multi-service stack)*
- `.env` (root) *(new — compose-level env: DB creds, secret key, SMTP, Redis URL)*

### ⚙️ Backend Requirements (FastAPI, Gunicorn, Celery)

- **`backend/Dockerfile`:** base `python:3.12-slim`; install build deps for `psycopg2`; `COPY requirements.txt` and `pip install`; `COPY` app; expose `4010`. Default command runs Gunicorn with Uvicorn workers: `gunicorn app.main:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:4010 --workers 4`. Add `gunicorn` to `requirements.txt`.
- **`entrypoint.sh`:** wait for Postgres to accept connections, run `alembic upgrade head`, optionally seed roles (idempotent), then `exec` the passed command (Gunicorn / Celery). Reuse the same image for `web`, `celery_worker`, and `celery_beat` by overriding `command`.
- **In-container hosts:** the DB host becomes `postgres:5432` and Redis `redis:6379` (compose service DNS) — **not** `localhost:5433`. The compose-level `.env`/service env must set `DATABASE_URL=postgresql://postgres:password@postgres:5432/gms_db` and `REDIS_URL=redis://redis:6379/0` for the containerized services. (The host-mapped `5433` from earlier phases is only for connecting from the host.)

### 🎨 Frontend Requirements (React, Vite, Nginx)

- **`frontend/Dockerfile` (multi-stage):**
  - Stage 1 `node:20-alpine`: `npm ci`, `npm run build` → `/app/dist`.
  - Stage 2 `nginx:alpine`: copy `dist` to `/usr/share/nginx/html`, copy `nginx.conf`; expose `80`.
- **`nginx.conf`:** SPA fallback `try_files $uri /index.html;` so React Router deep links work; optionally reverse-proxy `/api` → `http://web:4010` so the browser can use a same-origin `/api/v1` base. If proxying, update `src/services/api.js` `baseURL` to `"/api/v1"` for the production build (env-aware: `import.meta.env.PROD ? "/api/v1" : http://${window.location.hostname}:4010/api/v1`).
- Confirm CORS in `app/main.py` includes the frontend's served origin (e.g. `http://localhost:4000` in dev; for the proxied prod setup, same-origin needs no CORS entry).

### ⛓️ Full `docker-compose.yml` services

```yaml
services:
  postgres:        # image: postgres:15-alpine, volume gms_data, ports 5433:5432
  redis:           # image: redis:7-alpine, ports 6379:6379
  web:             # build ./backend, entrypoint runs alembic + gunicorn, ports 4010:4010, depends_on [postgres, redis]
  celery_worker:   # build ./backend, command: celery -A app.worker.celery_app.celery worker -l info, depends_on [redis, postgres]
  celery_beat:     # build ./backend, command: celery -A app.worker.celery_app.celery beat -l info, depends_on [redis, postgres]
  frontend:        # build ./frontend, ports 4000:80, depends_on [web]
volumes:
  gms_data:
```
All services share the default compose network; reference each other by service name. Keep the existing named volume `gms_data` so data persists. Optionally add a `mailhog` service for email testing (Phase 20).

### ⛓️ Decoupled/Mocking Protocol

Not applicable (infrastructure phase). For a smoke "mock" of a healthy stack, `GET http://localhost:4010/` should return `{"status":"ok","project":"Grievance Management System"}` and `http://localhost:4000/` should serve the SPA.

### 🛡️ Verification & Testing Checklist

1. **One-command boot** — `docker compose up --build` brings up postgres, redis, web, celery_worker, celery_beat, and frontend with no crash loops; `docker compose ps` shows all healthy.
2. **Migrations on start** — The `web` entrypoint runs `alembic upgrade head` automatically; a fresh volume yields all tables (verify via `docker compose exec postgres psql -U postgres -d gms_db -c "\dt"`).
3. **End-to-end in containers** — Open `http://localhost:4000`, register, log in, file a ticket; confirm the API (`web`) responds and the SPA deep link (`/grievances/new`) loads directly (Nginx fallback works).
4. **Background automation** — Force a breach and confirm `celery_beat` schedules and `celery_worker` executes the SLA sweep (escalation + audit row appear), proving Redis + workers are wired on the shared network.
