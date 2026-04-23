import axios from "axios";

/**
 * NewsNest API client with automatic token injection and base URL from env.
 * @module api
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:4000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("newsnest_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
