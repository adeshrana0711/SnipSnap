
import axios from "axios";

const configuredUrl = (
  import.meta.env.VITE_API_URL || ""
).replace(/\/+$/, "");

const API_BASE_URL = configuredUrl.endsWith("/api")
  ? configuredUrl
  : `${configuredUrl}/api`.replace(/^\/api\/api$/, "/api");

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const apiFetch = (path, options = {}) => {
  const endpoint = path.startsWith("/") ? path : `/${path}`;

  return fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: "include",
    ...options,
  });
};

export default api;
