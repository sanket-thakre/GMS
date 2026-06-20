import api from "./api";

// Phase 14: Assignment Engine. Rule CRUD is admin-only; the manual-transfer
// UI itself is delivered in Phase 18 — these are the service stubs.

// ── Assignment Rules (admin) ─────────────────────────────────────────
export const listRules = () => api.get("/assignment-rules");

export const createRule = (payload) => api.post("/assignment-rules", payload);

export const updateRule = (id, payload) =>
  api.put(`/assignment-rules/${id}`, payload);

export const deleteRule = (id) => api.delete(`/assignment-rules/${id}`);

// ── Manual transfer ──────────────────────────────────────────────────
// payload: { hierarchy_id: number, reason?: string }
export const transferTicket = (ticketId, payload) =>
  api.post(`/tickets/${ticketId}/transfer`, payload);
