import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";

export function SettingsScreen() {
  const { t } = useTranslation();
  const [coach, setCoach] = useState(undefined);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);

  function load() { api.get("/me/coach").then(setCoach).catch(() => setCoach(null)); }
  useEffect(() => { load(); }, []);

  async function link(e) {
    e.preventDefault();
    setError(null);
    try { setCoach(await api.post("/me/coach", { coachCode: code })); setCode(""); }
    catch (err) { setError(err.message === "Already linked to a coach" ? t("settings.already") : t("settings.invalid")); }
  }

  return (
    <>
      <AppHeader title={t("settings.title").toUpperCase()} />
      <div className="flex-1 p-4 space-y-4">
        <h2 className="font-heading uppercase tracking-wide text-sm">{t("settings.yourCoach")}</h2>
        {coach === undefined ? <Spinner /> : coach ? (
          <div className="border-2 border-success p-3">
            <span className="font-heading uppercase text-xs text-ink/60">{t("settings.linked")}</span>
            <div className="font-bold">{coach.name}</div>
          </div>
        ) : (
          <form onSubmit={link} className="space-y-2">
            <p className="text-ink/60 text-sm">{t("settings.noCoach")}</p>
            <input aria-label={t("settings.enterCode")} value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("settings.enterCode")} className="w-full p-3 border-2 border-ink rounded-none" required />
            {error && <p role="alert" className="text-danger">{error}</p>}
            <Button type="submit" variant="primary" className="w-full">{t("settings.link")}</Button>
          </form>
        )}
      </div>
    </>
  );
}
