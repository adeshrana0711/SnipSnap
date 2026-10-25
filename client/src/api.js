import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export const apiFetch = (path, options = {}) => {
  const endpoint = path.startsWith("/") ? path : `/${path}`;

  return fetch(`/api${endpoint}`, {
    credentials: "include",
    ...options,
  });
};

export default api;
