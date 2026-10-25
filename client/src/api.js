import axios from "axios";

const API_BASE_URL = "/api";

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
