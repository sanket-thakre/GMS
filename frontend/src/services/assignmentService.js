import api from "./api";

// Phase 18: transfer a ticket to a different office.
// payload: { hierarchy_id: number, reason?: string }
export const transferTicket = (id, payload) =>
  api.post(`/tickets/${id}/transfer`, payload);
