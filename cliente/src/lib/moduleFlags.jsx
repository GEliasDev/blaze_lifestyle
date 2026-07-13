import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";
import { useAuth } from "./auth.jsx";
import { APP_ENV } from "./env.js";

const Ctx = createContext(null);

// Superuser-controlled on/off switches per module (see servidor's admin
// module) — `flags` is null while loading, then e.g. { nutrition: true,
// exercise: false, sleep: true, bodyComp: true }. Fetched once per login;
// re-fetched if the logged-in user changes (login/logout/switch account).
export function ModuleFlagsProvider({ children }) {
  const { user } = useAuth();
  const [flags, setFlags] = useState(null);

  useEffect(() => {
    if (!user) { setFlags(null); return; }
    let active = true;
    api.get("/module-flags", { env: APP_ENV }).then((list) => {
      if (active) setFlags(Object.fromEntries(list.map((f) => [f.key, f.enabled])));
    }).catch(() => { if (active) setFlags({}); });
    return () => { active = false; };
  }, [user]);

  return <Ctx.Provider value={{ flags }}>{children}</Ctx.Provider>;
}

export function useModuleFlags() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useModuleFlags must be used within ModuleFlagsProvider");
  return ctx;
}
