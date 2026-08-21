/* Phase I — local API client.
   Talks to the FastAPI catalogue API (served from the backend). Base URL is
   configurable; in dev it points at the local FastAPI server, and in a
   same-origin production build it falls back to relative URLs. */

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

export function getApiBase() {
  return API_BASE;
}

export async function apiGet(path, { signal } = {}) {
  const url = API_BASE + path;
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).detail || "";
    } catch (e) {
      /* ignore body parse errors */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.json();
}
