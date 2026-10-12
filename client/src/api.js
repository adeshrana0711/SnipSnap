const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(path, options = {}) {
  if (!API_URL) {
    throw new Error("VITE_API_URL is not configured");
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
  });
}