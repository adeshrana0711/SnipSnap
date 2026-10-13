export async function apiFetch(path, options = {}) {
  if (typeof path !== "string" || !path.trim()) {
    throw new Error("API path must be a non-empty string");
  }

  const cleanPath = `/${path.trim().replace(/^\/+/, "")}`;

  const response = await fetch(cleanPath, {
    ...options,
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const responseText = await response.text();

    throw new Error(
      `Unexpected server response (${response.status}): ${
        responseText.slice(0, 150) || "Empty response"
      }`
    );
  }

  return response;
}
