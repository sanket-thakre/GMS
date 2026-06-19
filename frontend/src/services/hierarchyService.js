import api from "./api";

// The create/edit form holds parent_id as "" for a root office (empty <select>).
// The backend declares parent_id: int | None, so an empty string in the body
// fails int validation (422). Normalize "" -> null before sending.
const normalize = (payload = {}) => ({
  ...payload,
  parent_id: payload.parent_id === "" ? null : payload.parent_id,
});

export const hierarchyService = {
  listHierarchies: (params) => api.get("/hierarchies", { params }),
  getTree: () => api.get("/hierarchies/tree"),
  getHierarchy: (id) => api.get(`/hierarchies/${id}`),
  createHierarchy: (payload) => api.post("/hierarchies", normalize(payload)),
  updateHierarchy: (id, payload) => api.put(`/hierarchies/${id}`, normalize(payload)),
  deleteHierarchy: (id) => api.delete(`/hierarchies/${id}`),
};
