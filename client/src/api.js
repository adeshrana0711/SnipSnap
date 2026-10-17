
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

export const apiFetch = (path, options = {}) =>
  fetch(
    `${import.meta.env.VITE_API_URL || "/api"}${
      path.startsWith("/") ? path : `/${path}`
    }`,
    {
      credentials: "include",
      ...options,
    }
  );

export default api;
