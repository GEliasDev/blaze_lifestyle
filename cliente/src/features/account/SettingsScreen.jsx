import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { User, Lock, Check } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";
import { useAuth } from "../../lib/auth.jsx";
import { COACH_NAV_ITEMS } from "../coach/coachNav.js";

// Shared by both roles (mounted at /settings for clients, /coach/settings
// for coaches) — the "your coach" tab only applies to clients, since a coach
// doesn't link to one themselves.
export function SettingsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isCoach = user?.role === "coach";
  const [coach, setCoach] = useState(undefined);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileTab, setProfileTab] = useState(isCoach ? "profile" : "coach");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  function loadCoach() { api.get("/me/coach").then(setCoach).catch(() => setCoach(null)); }
  function loadProfile() {
    api.get("/me/profile").then((p) => {
      setProfile(p);
      setName(p.name);
      setEmail(p.email);
    }).catch(() => {});
  }
  useEffect(() => { if (!isCoach) loadCoach(); loadProfile(); }, [isCoach]);

  async function link(e) {
    e.preventDefault();
    setError(null);
    try { setCoach(await api.post("/me/coach", { coachCode: code })); setCode(""); }
    catch (err) { setError(err.message === "Already linked to a coach" ? t("settings.already") : t("settings.invalid")); }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.patch("/me/profile", { name, email });
      setSaveMsg(t("settings.profileSaved"));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setSaveMsg(null);
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t("settings.passwordMismatch"));
      return;
    }
    setSaving(true);
    try {
      await api.post("/me/change-password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaveMsg(t("settings.passwordSaved"));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const field = "w-full p-3 border-2 border-ink rounded-none";

  return (
    <>
      <AppHeader
        title={t("settings.title").toUpperCase()}
        navItems={isCoach ? COACH_NAV_ITEMS : undefined}
        settingsTo={isCoach ? "/coach/settings" : "/settings"}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="flex border-2 border-border">
          {!isCoach && (
            <button onClick={() => setProfileTab("coach")}
              className={`flex-1 min-h-[44px] font-heading uppercase tracking-wide text-sm flex items-center justify-center gap-2 ${profileTab === "coach" ? "bg-primary text-white" : "bg-white text-ink"}`}>
              <User className="w-4 h-4" />{t("settings.yourCoach")}
            </button>
          )}
          <button onClick={() => setProfileTab("profile")}
            className={`flex-1 min-h-[44px] font-heading uppercase tracking-wide text-sm flex items-center justify-center gap-2 ${profileTab === "profile" ? "bg-primary text-white" : "bg-white text-ink"}`}>
            <User className="w-4 h-4" />{t("settings.profile")}
          </button>
          <button onClick={() => setProfileTab("password")}
            className={`flex-1 min-h-[44px] font-heading uppercase tracking-wide text-sm flex items-center justify-center gap-2 ${profileTab === "password" ? "bg-primary text-white" : "bg-white text-ink"}`}>
            <Lock className="w-4 h-4" />{t("settings.password")}
          </button>
        </div>

        {profileTab === "coach" && (
          <div className="space-y-4">
            <h2 className="font-heading uppercase tracking-wide text-sm">{t("settings.yourCoach")}</h2>
            {coach === undefined ? <Spinner /> : coach ? (
              <div className="border-2 border-success p-3">
                <span className="font-heading uppercase text-xs text-ink/60">{t("settings.linked")}</span>
                <div className="font-bold">{coach.name}</div>
              </div>
            ) : (
              <form onSubmit={link} className="space-y-2">
                <p className="text-ink/60 text-sm">{t("settings.noCoach")}</p>
                <input aria-label={t("settings.enterCode")} value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("settings.enterCode")} className={field} required />
                {error && <p role="alert" className="text-danger">{error}</p>}
                <Button type="submit" variant="primary" className="w-full">{t("settings.link")}</Button>
              </form>
            )}
          </div>
        )}

        {profileTab === "profile" && (
          <form onSubmit={saveProfile} className="space-y-4">
            <h2 className="font-heading uppercase tracking-wide text-sm">{t("settings.profile")}</h2>
            <label className="block space-y-1">
              <span className="font-heading uppercase text-sm">{t("register.name")}</span>
              <input aria-label={t("register.name")} value={name} onChange={(e) => setName(e.target.value)} className={field} required />
            </label>
            <label className="block space-y-1">
              <span className="font-heading uppercase text-sm">{t("auth.email")}</span>
              <input aria-label={t("auth.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} required />
            </label>
            {error && <p role="alert" className="text-danger">{error}</p>}
            {saveMsg && <p className="text-success flex items-center gap-1"><Check className="w-4 h-4" />{saveMsg}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={saving}>{t("settings.save")}</Button>
          </form>
        )}

        {profileTab === "password" && (
          <form onSubmit={savePassword} className="space-y-4">
            <h2 className="font-heading uppercase tracking-wide text-sm">{t("settings.changePassword")}</h2>
            <label className="block space-y-1">
              <span className="font-heading uppercase text-sm">{t("settings.currentPassword")}</span>
              <input aria-label={t("settings.currentPassword")} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={field} required />
            </label>
            <label className="block space-y-1">
              <span className="font-heading uppercase text-sm">{t("settings.newPassword")}</span>
              <input aria-label={t("settings.newPassword")} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={field} required />
            </label>
            <label className="block space-y-1">
              <span className="font-heading uppercase text-sm">{t("settings.confirmPassword")}</span>
              <input aria-label={t("settings.confirmPassword")} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={field} required />
            </label>
            {error && <p role="alert" className="text-danger">{error}</p>}
            {saveMsg && <p className="text-success flex items-center gap-1"><Check className="w-4 h-4" />{saveMsg}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={saving}>{t("settings.save")}</Button>
          </form>
        )}
      </div>
    </>
  );
}
