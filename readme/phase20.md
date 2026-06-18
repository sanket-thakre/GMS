## 📋 Phase 20: Notification Service (Email)

- **Target Developer Assignment:** Stream 1: Automation.
- **Primary Objective:** Send automated transactional emails on key lifecycle events (ticket created, assigned, escalated, resolved) via `fastapi-mail`, dispatched asynchronously through the Celery worker so request latency is unaffected.

### 🗂️ Target File Directory Architecture

**Backend**
- `backend/app/core/config.py` *(modify — add SMTP settings)*
- `backend/.env` *(modify — add SMTP credentials)*
- `backend/app/services/email_service.py` *(new — `fastapi-mail` config + send helpers)*
- `backend/app/worker/tasks.py` *(modify — add `send_email_task`)*
- `backend/app/services/notifications.py` *(new — event → recipient/template mapping)*
- `backend/app/templates/email/*.html` *(new — Jinja2 email templates)*
- `backend/requirements.txt` *(modify — add `fastapi-mail`)*
- *(integration)* call the notification triggers from ticket create/transfer/escalate/status endpoints.

### ⚙️ Backend Requirements (FastAPI, fastapi-mail & Celery)

**Config additions (`app/core/config.py`):**
- `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_PORT: int = 587`, `MAIL_SERVER`, `MAIL_STARTTLS: bool = True`, `MAIL_SSL_TLS: bool = False`, `MAIL_FROM_NAME: str = "GMS Notifications"`, and `EMAIL_ENABLED: bool = False` (a master switch so local/dev runs don't attempt real SMTP). For dev, point `MAIL_SERVER` at Mailtrap/MailHog.

**Email service (`app/services/email_service.py`):**
- Build a `ConnectionConfig` from settings and a `FastMail` instance.
- `async def send_email(to: list[str], subject: str, template_name: str, context: dict)` — renders the Jinja2 template and sends. Guard with `if not settings.EMAIL_ENABLED: log and return`.

**Async dispatch (`app/worker/tasks.py`):**
- `@celery.task(name="app.worker.tasks.send_email_task") def send_email_task(to, subject, template_name, context):` — run the async `send_email` via `asyncio.run(...)` inside the worker. This keeps SMTP latency/failures off the API request path and gives retries (`bind=True`, `max_retries`).

**Notification mapping (`app/services/notifications.py`):** one function per event that figures out recipients + template + context, then enqueues `send_email_task.delay(...)`:
- `notify_ticket_created(ticket, complainant)` → email the complainant (template `ticket_created.html`, includes `ticket_number`, SLA due date).
- `notify_ticket_assigned(ticket, office)` → email the assigned office's officers (query `User` where `hierarchy_id == office.id`).
- `notify_ticket_escalated(ticket, old_office, new_office)` → email the new office's officers + optionally the complainant.
- `notify_ticket_resolved(ticket, complainant)` → email the complainant.

**Integration:** invoke these from the existing endpoints/services — `POST /tickets` (created + assigned), `escalate_ticket` (escalated), `PATCH /status` when status→Resolved (resolved). Because dispatch is `.delay(...)`, the API returns immediately even if SMTP is slow/down.

**Templates (`app/templates/email/`):** simple branded HTML (`ticket_created.html`, `ticket_assigned.html`, `ticket_escalated.html`, `ticket_resolved.html`) with Jinja2 placeholders.

### 🎨 Frontend Requirements (React & Tailwind)

No UI in this phase. Optionally, surface a non-blocking confirmation toast after submission ("A confirmation email has been sent to <email>") in the Phase 12 success card — purely cosmetic; it must not depend on email delivery success.

### ⛓️ Decoupled/Mocking Protocol

No HTTP contract. For local testing without real SMTP, set `EMAIL_ENABLED=true` and `MAIL_SERVER` to a **MailHog** container (`mailhog/mailhog`, SMTP `1025`, UI `8025`) or Mailtrap sandbox. With `EMAIL_ENABLED=false`, the service logs the intended email payload instead of sending:
```
[email_service] (disabled) would send to=['ramesh@example.com'] subject='Grievance GMS-2026-000001 registered' template='ticket_created.html'
```

### 🛡️ Verification & Testing Checklist

1. **Created email** — With MailHog running and `EMAIL_ENABLED=true`, submit a ticket; confirm a `ticket_created` email lands in the MailHog UI addressed to the complainant with the correct ticket number.
2. **Assigned email** — Confirm the assigned office's officer(s) receive a `ticket_assigned` email after auto-routing (Phase 14).
3. **Async safety** — Stop the SMTP server, submit a ticket; confirm the API still returns 201 promptly (email is queued via Celery, failure is isolated to the worker with retries).
4. **Master switch** — With `EMAIL_ENABLED=false`, confirm no SMTP attempt is made and the intended send is logged instead.
