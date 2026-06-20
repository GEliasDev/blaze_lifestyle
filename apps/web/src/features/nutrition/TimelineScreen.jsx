import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Clock } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { ComplianceBadge } from "../../components/ComplianceBadge.jsx";

function dayKey(iso) { return new Date(iso).toISOString().slice(0, 10); }
function time(iso) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

export function TimelineScreen() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState(null);
  useEffect(() => { api.get("/me/entries").then(setEntries).catch(() => setEntries([])); }, []);
  if (!entries) return (<><AppHeader /><Spinner /></>);

  const days = [...new Set(entries.map((e) => dayKey(e.eatenAt)))].sort((a, b) => (a < b ? 1 : -1));
  return (
    <>
      <AppHeader />
      <div className="flex-1 overflow-y-auto bg-muted">
        {entries.length === 0 && <p className="p-8 text-center font-heading uppercase text-ink/50">{t("entry.noEntries")}</p>}
        {days.map((d) => (
          <section key={d}>
            <h2 className="sticky top-0 bg-ink/90 text-white px-4 py-2 font-heading uppercase tracking-wide text-sm">{d}</h2>
            <div className="p-3 space-y-3">
              {entries.filter((e) => dayKey(e.eatenAt) === d).map((e) => (
                <Link key={e.id} to={`/entry/${e.id}`} className="flex gap-3 bg-white border-2 border-border p-3 hover:border-primary">
                  {e.photos?.[0] && <AuthImage path={`/photos/${e.photos[0].thumbKey}`} className="w-16 h-16 object-cover border-2 border-border" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading uppercase tracking-wide font-bold">{t(`category.${e.category}`)}</span>
                      {e.hasSymptoms && <AlertCircle className="w-4 h-4 text-danger" />}
                    </div>
                    {e.description && <p className="text-sm text-ink/70">{e.description}</p>}
                    <div className="flex items-center justify-between mt-1">
                      <span className="flex items-center gap-1 text-xs text-ink/50"><Clock className="w-3 h-3" />{time(e.eatenAt)}</span>
                      <ComplianceBadge value={e.coachCompliance ?? "pending"} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
