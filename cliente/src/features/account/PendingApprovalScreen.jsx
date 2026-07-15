import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, LogOut, XCircle } from "lucide-react";
import { api } from "../../lib/api.js";
import { useAuth } from "../../lib/auth.jsx";
import { useCoachStatus } from "../../lib/coachStatus.jsx";
import { Button } from "../../components/Button.jsx";

// Shown instead of the whole app while a client's coach link is "pending" or
// "rejected" — see RequireApprovedClient in app/router.jsx. Nothing here can
// be dismissed or skipped; it clears on its own once the coach accepts them
// (coachStatus is polled, see lib/coachStatus.jsx). A rejected client isn't
// stuck, though — they can submit a new coach code (same or different) right
// from here, since the rest of the app is unreachable while gated.
export function PendingApprovalScreen() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { coachStatus, refetch } = useCoachStatus();
  const rejected = coachStatus?.status === "rejected";
  const [coachCode, setCoachCode] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function onRetry(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try { await api.post("/me/coach", { coachCode: coachCode.trim() }); refetch(); }
    catch (err) { setError(err.message || t("common.error")); }
    finally { setSaving(false); }
  }

  return (
    <div className="h-dvh overflow-y-auto flex items-center justify-center p-4 bg-white">
      <div className="text-center space-y-4 max-w-sm w-full">
        {rejected
          ? <XCircle className="w-12 h-12 text-danger mx-auto" />
          : <Clock className="w-12 h-12 text-primary mx-auto" />}
        <h1 className="font-heading uppercase tracking-wide text-xl">
          {rejected ? t("pending.rejectedTitle") : t("pending.title")}
        </h1>
        <p className="text-ink/60 text-sm">
          {rejected ? t("pending.rejectedMessage") : t("pending.message")}
        </p>

        {rejected && (
          <form onSubmit={onRetry} className="space-y-2 text-left">
            <label className="block space-y-1">
              <span className="font-heading uppercase text-sm">{t("register.coachCode")}</span>
              <input
                aria-label={t("register.coachCode")}
                value={coachCode}
                onChange={(e) => setCoachCode(e.target.value)}
                className="w-full p-3 border-2 border-ink rounded-none"
                required
              />
            </label>
            {error && <p role="alert" className="text-danger text-sm">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={saving || !coachCode.trim()}>
              {t("pending.retry")}
            </Button>
          </form>
        )}

        <button
          onClick={logout}
          className="min-h-[44px] px-4 font-heading uppercase tracking-wide border-2 border-ink bg-white flex items-center gap-2 mx-auto"
        >
          <LogOut className="w-4 h-4" />{t("auth.logout")}
        </button>
      </div>
    </div>
  );
}
