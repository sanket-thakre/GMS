import api from "./api";

// `formData` is a FormData instance carrying subcategory_id, description,
// priority, and any files[] so attachments ride along with the request.
// Note: do NOT hand-set Content-Type — let Axios/the browser add the
// `multipart/form-data; boundary=…` header so the server can parse the upload.
export const createTicket = (formData) => api.post("/tickets/", formData);

export const getTicket = (id) => api.get(`/tickets/${id}`);

// Phase 13: paginated, role-aware list. `params` may include status, priority,
// category_id, subcategory_id, assigned_hierarchy_id, mine, date_from, date_to,
// search, sort_by, order, page, page_size. Returns PaginatedTickets.
export const listTickets = (params = {}) => api.get("/tickets", { params });

// Phase 12: convenience for the complainant "My Grievances" page.
export const listMyTickets = (params = {}) =>
  listTickets({ mine: true, ...params });

// Phase 15: officer status transition. Returns the updated TicketOut.
export const updateTicketStatus = (id, status, note = null) =>
  api.patch(`/tickets/${id}/status`, { status, note });

// Phase 18: manual escalation. `payload` must include `reason`.
export const escalateTicket = (id, payload) =>
  api.post(`/tickets/${id}/escalate`, payload);

// Phase 19: fetch the chronological audit trail for a ticket.
export const getAuditTrail = (id) => api.get(`/tickets/${id}/audit`);
