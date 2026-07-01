import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Filter, Plus, AlertCircle, Clock } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { useNutritionScope } from "./useNutritionScope.js";

const CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];

// Group by LOCAL calendar day (en-CA → YYYY-MM-DD) so meals near midnight
// don't split across UTC day boundaries.
function dayKey(iso) { return new Date(iso).toLocaleDateString("en-CA"); }
function timeOf(iso) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

export function NutritionScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { apiBase, linkBase, isCoach, clientId } = useNutritionScope();
  const [entries, setEntries] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [symptomsOnly, setSymptomsOnly] = useState(false);

  useEffect(() => { api.get(apiBase).then(setEntries).catch(() => setEntries([])); }, [apiBase]);

  function formatDate(key) {
    const today = new Date().toLocaleDateString("en-CA");
    if (key === today) return t("meal.today");
    return new Date(`${key}T00:00:00`).toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e) => (!category || e.category === category) && (!symptomsOnly || e.hasSymptoms));
  }, [entries, category, symptomsOnly]);

  const days = useMemo(() => [...new Set(filtered.map((e) => dayKey(e.eatenAt)))].sort((a, b) => (a < b ? -1 : 1)), [filtered]);

  return (
    <>
      <AppHeader title={t("module.nutrition").toUpperCase()} showBack={isCoach} backTo={isCoach ? `/coach/clients/${clientId}` : null} />

      {filterOpen && (
        <div className="bg-muted border-b-2 border-primary p-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(category === c ? "" : c)}
                className={`px-3 min-h-[36px] border-2 text-xs font-heading uppercase tracking-wide ${category === c ? "bg-primary text-white border-primary" : "bg-white text-ink border-border"}`}
              >
                {t(`category.${c}`)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={symptomsOnly} onChange={(e) => setSymptomsOnly(e.target.checked)} className="w-5 h-5" />
            <span className="text-sm font-medium">{t("meal.symptomsOnly")}</span>
          </label>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-muted">
        {!entries ? <Spinner /> : days.length === 0 ? (
          <p className="p-8 text-center font-heading uppercase text-ink/50">{t("entry.noEntries")}</p>
        ) : (
          days.map((d) => (
            <section key={d}>
              <h2 className="sticky top-0 z-10 bg-ink/90 text-white px-4 py-2 font-heading uppercase tracking-wide text-sm">{formatDate(d)}</h2>
              <div className="p-3 space-y-3">
                {filtered.filter((e) => dayKey(e.eatenAt) === d).map((e) => (
                  <Link key={e.id} to={`${linkBase}/${e.id}`} className="flex gap-3 bg-white border-2 border-border p-3 hover:border-primary">
                    <div className="relative w-20 h-20 shrink-0">
                      {e.photos?.[0]
                        ? <AuthImage path={`/photos/${e.photos[0].thumbKey}`} className="w-20 h-20 object-cover border-2 border-border" />
                        : <div className="w-20 h-20 border-2 border-border bg-muted" />}
                      {e.photos?.length > 1 && (
                        <span className="absolute -bottom-1 -right-1 bg-primary text-white text-xs font-bold px-1">+{e.photos.length - 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading uppercase tracking-wide font-bold">{t(`category.${e.category}`)}</span>
                        {e.hasSymptoms && <AlertCircle className="w-4 h-4 text-danger shrink-0" />}
                      </div>
                      {e.description && <p className="text-sm text-ink/70 mt-1 line-clamp-2">{e.description}</p>}
                      <div className="flex items-center gap-1 text-xs text-ink/50 mt-2"><Clock className="w-3 h-3" />{timeOf(e.eatenAt)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <div className="border-t-2 border-border bg-white p-3 flex items-center justify-center gap-6">
        <button
          onClick={() => setFilterOpen((v) => !v)}
          aria-label={t("nav.filter")}
          aria-pressed={filterOpen}
          className={`min-h-[44px] min-w-[44px] flex items-center justify-center border-2 transition-colors ${filterOpen ? "border-primary text-primary" : "border-transparent text-ink/60"}`}
        >
          <Filter className="w-6 h-6" />
        </button>
        <button
          onClick={() => navigate(`${linkBase}/add`)}
          aria-label={t("meal.new")}
          className="min-h-[56px] min-w-[56px] flex items-center justify-center bg-primary text-white rounded-full transition-transform active:scale-95 motion-reduce:active:scale-100"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>
    </>
  );
}
