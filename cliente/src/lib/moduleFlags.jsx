import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";
import { useAuth } from "./auth.jsx";
import { APP_ENV } from "./env.js";

const Ctx = createContext(null);
const POLL_INTERVAL_MS = 60_000;

// Superuser-controlled on/off switches per module (see servidor's admin
// module) — `flags` is null while loading, then e.g. { nutrition: true,
// exercise: false, sleep: true, bodyComp: true }. Fetched on login, then
// re-fetched every POLL_INTERVAL_MS so a superuser toggling a module takes
// effect for already-open sessions without anyone needing to refresh —
// updating this state alone is enough for ModuleGate to re-render.
export function ModuleFlagsProvider({ children }) {
  const { user } = useAuth();
  const [flags, setFlags] = useState(null);

  useEffect(() => {
    if (!user) { setFlags(null); return; }
    let active = true;
    function fetchFlags() {
      api.get("/module-flags", { env: APP_ENV }).then((list) => {
        if (active) setFlags(Object.fromEntries(list.map((f) => [f.key, f.enabled])));
      }).catch(() => { if (active) setFlags((prev) => prev ?? {}); });
    }
    fetchFlags();
    const id = setInterval(fetchFlags, POLL_INTERVAL_MS);
    return () => { active = false; clearInterval(id); };
  }, [user]);

  return <Ctx.Provider value={{ flags }}>{children}</Ctx.Provider>;
}

export function useModuleFlags() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useModuleFlags must be used within ModuleFlagsProvider");
  return ctx;
}
