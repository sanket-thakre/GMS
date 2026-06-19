import api from "./api";

// Strip empty/blank query params before sending. The backend declares typed
// query validators (e.g. hierarchy_id: int | None); an empty string like
// "?hierarchy_id=" fails int validation and returns 422 ("Failed to load users").
const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== "" && v !== null && v !== undefined
    )
  );

export const userService = {
  listUsers: (params) => api.get("/users", { params: cleanParams(params) }),
  assignUser: (userId, payload) => api.patch(`/users/${userId}/assign`, payload),
};
