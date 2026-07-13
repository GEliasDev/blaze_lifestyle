import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";
import { useAuth } from "../../lib/auth.jsx";

export function ClientsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [clients, setClients] = useState(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    setClients(null);
    api.get("/coach/clients").then(setClients).catch(() => setError(true));
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{t("coach.clients")}</h1>
      {user?.coachCode && (
        <div className="flex items-center justify-between border-2 border-primary p-3">
          <div>
            <div className="font-heading uppercase text-xs text-ink/60">{t("coach.yourCode")}</div>
            <div className="font-heading text-2xl tracking-[0.3em] text-primary">{user.coachCode}</div>
          </div>
          <button onClick={() => navigator.clipboard?.writeText(user.coachCode)} className="border-2 border-ink min-h-[44px] px-3 font-heading uppercase text-sm">{t("coach.copy")}</button>
        </div>
      )}
      {error ? (
        <div className="border-2 border-border p-4 space-y-3 text-center">
          <p className="text-ink/60 text-sm">{t("common.error")}</p>
          <Button variant="secondary" onClick={load}>{t("common.retry")}</Button>
        </div>
      ) : !clients ? <Spinner /> : clients.length === 0 ? (
        <p className="text-ink/50 text-sm">{t("coach.noClients")}</p>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <Link key={c.id} to={`/coach/clients/${c.id}`} className="block border-2 border-border p-4 hover:border-primary">
              <div className="font-heading uppercase tracking-wide font-bold">{c.name}</div>
              <div className="text-sm text-ink/60">{c.email}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
