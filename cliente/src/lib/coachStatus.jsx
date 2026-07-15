import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";
import { useAuth } from "./auth.jsx";

const Ctx = createContext(null);
const POLL_INTERVAL_MS = 30_000;

// Only relevant for the "client" role — tracks whether this client's link to
// their coach is still pending, was rejected, or is approved (see
// coaching.service.js on the backend). Polled while logged in so a client
// stuck on the waiting screen (RequireApprovedClient in app/router.jsx)
// unlocks automatically the moment their coach accepts them, no refresh
// needed. `coachStatus` is null while loading, then either
// { hasCoach: false } (never linked — not gated, backward-compatible with
// clients who predate this feature) or { hasCoach: true, status, coachName }.
// `refetch` lets a rejected client's retry form (PendingApprovalScreen) pull
// the new status immediately instead of waiting out the poll interval.
export function CoachStatusProvider({ children }) {
  const { user } = useAuth();
  const [coachStatus, setCoachStatus] = useState(null);

  const refetch = useCallback(() => {
    if (!user || user.role !== "client") return;
    api.get("/me/coach").then((coach) => {
      setCoachStatus(coach ? { hasCoach: true, status: coach.status, coachName: coach.name } : { hasCoach: false });
    }).catch(() => { setCoachStatus((prev) => prev ?? { hasCoach: false }); });
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "client") { setCoachStatus(null); return; }
    refetch();
    const id = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user, refetch]);

  return <Ctx.Provider value={{ coachStatus, refetch }}>{children}</Ctx.Provider>;
}

export function useCoachStatus() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCoachStatus must be used within CoachStatusProvider");
  return ctx;
}
