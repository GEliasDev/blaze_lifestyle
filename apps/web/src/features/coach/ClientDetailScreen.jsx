import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { api } from "../../lib/api.js";
import { Spinner } from "../../components/Spinner.jsx";
import { ComplianceBadge } from "../../components/ComplianceBadge.jsx";

function Tile({ label, value }) {
  return <div className="border-2 border-border p-3 text-center"><div className="text-2xl font-heading">{value ?? "—"}</div><div className="text-xs font-heading uppercase text-ink/60">{label}</div></div>;
}

export function ClientDetailScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [client, setClient] = useState(null);
  const [entries, setEntries] = useState(null);
  useEffect(() => {
    api.get(`/coach/clients/${id}`).then(setClient).catch(() => {});
    api.get(`/coach/clients/${id}/entries`).then(setEntries).catch(() => setEntries([]));
  }, [id]);
  if (!client) return <Spinner />;

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="font-heading uppercase tracking-wide text-2xl">{client.name}</h1><p className="text-ink/60">{client.email}</p></div>
        <Link to={`/coach/clients/${id}/plan`} className="flex items-center gap-2 border-2 border-primary text-primary px-4 min-h-[44px] font-heading uppercase tracking-wide">
          <CalendarDays className="w-4 h-4" />{t("coach.editPlan")}
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Tile label={t("coach.totalEntries")} value={client.metrics.totalEntries} />
        <Tile label={t("coach.compliancePct")} value={client.metrics.compliancePct != null ? `${client.metrics.compliancePct}%` : null} />
        <Tile label={t("coach.symptomDays")} value={client.metrics.symptomDays} />
      </div>
      {!entries ? <Spinner /> : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Link key={e.id} to={`/coach/entries/${e.id}?client=${id}`} className="flex justify-between items-center border-2 border-border p-3 hover:border-primary">
              <span className="font-heading uppercase tracking-wide">{t(`category.${e.category}`)} · {new Date(e.eatenAt).toISOString().slice(0, 10)}</span>
              <ComplianceBadge value={e.coachCompliance ?? e.clientCompliance} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
