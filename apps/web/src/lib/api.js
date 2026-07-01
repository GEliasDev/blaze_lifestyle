const BASE = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:4000`;

function token() { return localStorage.getItem("accessToken"); }
function authHeaders(extra = {}) {
  const t = token();
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra };
}

// --- Access-token refresh (single-flight) ---
// The access token expires after 15 min. Instead of letting every request fail
// silently (which made screens render empty), a 401 triggers one refresh using
// the long-lived refresh token; if that fails the session is cleared and the
// user is sent to /login.
let refreshing = null;

async function doRefresh() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    return true;
  } catch { return false; }
}

function refreshAccess() {
  if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
  return refreshing;
}

function sessionExpired() {
  ["accessToken", "refreshToken", "user"].forEach((k) => localStorage.removeItem(k));
  if (window.location.pathname !== "/login") window.location.assign("/login");
}

function rawFetch(method, path, { body, form, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : "";
  const opts = { method, headers: authHeaders() };
  if (form) opts.body = form; // FormData: browser sets multipart boundary
  else if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  return fetch(`${BASE}/api${path}${qs}`, opts);
}

async function call(method, path, options = {}) {
  let res = await rawFetch(method, path, options);
  if (res.status === 401 && path !== "/auth/refresh") {
    if (!(await refreshAccess())) { sessionExpired(); throw new Error("Session expired"); }
    res = await rawFetch(method, path, options);
    if (res.status === 401) { sessionExpired(); throw new Error("Session expired"); }
  }
  if (res.status === 204) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? res.statusText);
  }
  return res.json();
}

export const api = {
  get: (p, query) => call("GET", p, { query }),
  post: (p, body) => call("POST", p, { body }),
  patch: (p, body) => call("PATCH", p, { body }),
  del: (p) => call("DELETE", p),
  postForm: (p, form) => call("POST", p, { form }),
  patchForm: (p, form) => call("PATCH", p, { form }),
  async blobUrl(path) {
    let res = await fetch(`${BASE}/api${path}`, { headers: authHeaders() });
    if (res.status === 401 && (await refreshAccess())) {
      res = await fetch(`${BASE}/api${path}`, { headers: authHeaders() });
    }
    if (!res.ok) throw new Error("image failed");
    return URL.createObjectURL(await res.blob());
  },
};
