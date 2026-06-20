// Default to the same host the page was served from (port 4000) so the app
// works both on the PC (localhost) and from a phone on the LAN (PC's IP),
// without hardcoding an address. Override with VITE_API_URL if needed.
const BASE = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:4000`;

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
