import api from "./api";

// Phase 11 contract stub. The submission UI is built in Phase 12.
// `payload` is a FormData instance carrying subcategory_id, description,
// priority, and any files[] so attachments ride along with the request.
export const createTicket = (formData) =>
  api.post("/tickets/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getTicket = (id) => api.get(`/tickets/${id}`);

// Phase 13: paginated, role-aware list. `params` may include status, priority,
// category_id, subcategory_id, assigned_hierarchy_id, mine, date_from, date_to,
// search, sort_by, order, page, page_size. Returns PaginatedTickets.
export const listTickets = (params = {}) => api.get("/tickets", { params });
