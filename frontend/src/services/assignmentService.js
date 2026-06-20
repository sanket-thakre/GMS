import api from "./api";

// Phase 14: Assignment Engine. Rule CRUD is admin-only; the manual-transfer
// UI is delivered in Phase 18 and reuses transferTicket below.

// ── Assignment Rules (admin) ─────────────────────────────────────────
export const listRules = () => api.get("/assignment-rules");

export const createRule = (payload) => api.post("/assignment-rules", payload);

export const updateRule = (id, payload) =>
  api.put(`/assignment-rules/${id}`, payload);

export const deleteRule = (id) => api.delete(`/assignment-rules/${id}`);

// ── Manual transfer ──────────────────────────────────────────────────
// payload: { hierarchy_id: number, reason?: string }
export const transferTicket = (id, payload) =>
  api.post(`/tickets/${id}/transfer`, payload);
