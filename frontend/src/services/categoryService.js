import api from "./api";

// ── Category API ────────────────────────────────────────────────────

export const listCategories = () => api.get("/categories");

export const listWithSubs = () => api.get("/categories/with-subcategories");

export const createCategory = (payload) => api.post("/categories", payload);

export const updateCategory = (id, payload) =>
  api.put(`/categories/${id}`, payload);

export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// ── Subcategory API ─────────────────────────────────────────────────

export const listSubcategories = (categoryId) =>
  api.get(`/categories/${categoryId}/subcategories`);

export const createSubcategory = (categoryId, payload) =>
  api.post(`/categories/${categoryId}/subcategories`, payload);

export const updateSubcategory = (id, payload) =>
  api.put(`/categories/subcategories/${id}`, payload);

export const deleteSubcategory = (id) =>
  api.delete(`/categories/subcategories/${id}`);
