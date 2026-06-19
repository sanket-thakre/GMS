import api from "./api";

// Phase 11 contract stub. The submission UI is built in Phase 12.
// `payload` is a FormData instance carrying subcategory_id, description,
// priority, and any files[] so attachments ride along with the request.
export const createTicket = (formData) =>
  api.post("/tickets/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getTicket = (id) => api.get(`/tickets/${id}`);
