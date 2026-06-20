import api from "./api";

// `payload` is a FormData instance carrying subcategory_id, description,
// priority, and any files[] so attachments ride along with the request.
export const createTicket = (formData) =>
  api.post("/tickets/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const listTickets = (params = {}) => api.get("/tickets/", { params });

export const getTicket = (id) => api.get(`/tickets/${id}`);

export const updateTicketStatus = (id, status, note = null) =>
  api.patch(`/tickets/${id}/status`, { status, note });
