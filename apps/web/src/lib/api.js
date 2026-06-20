const BASE = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:4000`;

function token() { return localStorage.getItem("accessToken"); }
function authHeaders(extra = {}) {
  const t = token();
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra };
}

async function call(method, path, { body, form, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : "";
  const opts = { method, headers: authHeaders() };
  if (form) opts.body = form; // FormData: browser sets multipart boundary
  else if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  const res = await fetch(`${BASE}/api${path}${qs}`, opts);
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
  async blobUrl(path) {
    const res = await fetch(`${BASE}/api${path}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("image failed");
    return URL.createObjectURL(await res.blob());
  },
};
