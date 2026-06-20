import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { Spinner } from "../../components/Spinner.jsx";

export function ClientsScreen() {
  const { t } = useTranslation();
  const [clients, setClients] = useState(null);
  useEffect(() => { api.get("/coach/clients").then(setClients).catch(() => setClients([])); }, []);

  return (
    <div className="p-4 space-y-6">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{t("coach.clients")}</h1>
      {!clients ? <Spinner /> : (
        <div className="space-y-2">
          {clients.map((c) => (
            <Link key={c.id} to={`/coach/clients/${c.id}`} className="flex justify-between items-center border-2 border-border p-4 hover:border-primary">
              <div><div className="font-heading uppercase tracking-wide font-bold">{c.name}</div><div className="text-sm text-ink/60">{c.email}</div></div>
              <span className="font-heading text-primary">{c.totalEntries} {t("coach.totalEntries")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
