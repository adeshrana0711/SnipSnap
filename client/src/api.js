
import axios from "axios";

export const apiFetch = (path, options = {}) =>
  fetch(`/api${path.startsWith("/") ? path : `/${path}`}`, {
    credentials: "include",
    ...options,
  });

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export default api;
