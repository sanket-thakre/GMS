import api from "./api";

export const getSummary = (params = {}) =>
  api.get("/analytics/summary", { params });

export const getByCategory = () => api.get("/analytics/by-category");

export const getByStatus = () => api.get("/analytics/by-status");

export const getBreachesByOffice = () => api.get("/analytics/breaches-by-office");

export const getTrend = (days = 30) =>
  api.get("/analytics/trend", { params: { days } });
