const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function token() { return localStorage.getItem("accessToken"); }

async function call(method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? res.statusText);
  }
  return res.json();
}

export const api = {
  get: (p) => call("GET", p),
  post: (p, b) => call("POST", p, b),
};
