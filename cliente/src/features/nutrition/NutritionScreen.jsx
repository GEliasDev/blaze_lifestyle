import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Filter, Plus, AlertCircle, Calendar, Check, Clock, UtensilsCrossed, X } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { ListSkeleton } from "../../components/Skeleton.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { useNutritionScope } from "./useNutritionScope.js";

const CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];
const DEFAULT_WINDOW_DAYS = 30;

// Group by LOCAL calendar day (en-CA → YYYY-MM-DD) so meals near midnight
// don't split across UTC day boundaries.
function dayKey(iso) { return new Date(iso).toLocaleDateString("en-CA"); }
function timeOf(iso) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function todayKey() { return new Date().toLocaleDateString("en-CA"); }
function daysBefore(dayStr, n) {
  const d = new Date(`${dayStr}T00:00:00`);
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-CA");
}
function startOfDayISO(dayStr) { return new Date(`${dayStr}T00:00:00`).toISOString(); }
function endOfDayISO(dayStr) { return new Date(`${dayStr}T23:59:59.999`).toISOString(); }

export function NutritionScreen({ refreshKey } = {}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id: activeId } = useParams();
  const { apiBase, linkBase, isCoach } = useNutritionScope();
  const [entries, setEntries] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [symptomsOnly, setSymptomsOnly] = useState(false);
  const [mealGuideOnly, setMealGuideOnly] = useState(false);
  const [dayFrom, setDayFrom] = useState("");
  const [dayTo, setDayTo] = useState("");
  // Rolling window used when no explicit date-range filter is set — avoids
  // pulling a client's entire history (a year+ of daily logging) on every
  // load. "Load more" pushes this back another DEFAULT_WINDOW_DAYS.
  const [windowFrom, setWindowFrom] = useState(() => daysBefore(todayKey(), DEFAULT_WINDOW_DAYS - 1));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const usingExplicitRange = Boolean(dayFrom || dayTo);

  // refreshKey changes when add/edit/delete succeed elsewhere (see
  // NutritionLayout) — this component stays mounted across those navigations
  // for the desktop master–detail view, so it won't otherwise know to refetch.
  useEffect(() => {
    const range = usingExplicitRange
      ? { from: dayFrom ? startOfDayISO(dayFrom) : undefined, to: dayTo ? endOfDayISO(dayTo) : undefined }
      : { from: startOfDayISO(windowFrom), to: endOfDayISO(todayKey()) };
    const query = Object.fromEntries(Object.entries(range).filter(([, v]) => v));
    api.get(apiBase, query).then(setEntries).catch(() => setEntries([]));
  }, [apiBase, refreshKey, usingExplicitRange, dayFrom, dayTo, windowFrom]);

  // "Load more" only makes sense if something actually exists before the
  // loaded window — a cheap limit:1 probe avoids showing a button that would
  // just reload the same (empty) range when the client has < 30 days of history.
  useEffect(() => {
    if (usingExplicitRange) { setHasMore(false); return; }
    let active = true;
    api.get(apiBase, { to: endOfDayISO(daysBefore(windowFrom, 1)), limit: 1 })
      .then((older) => { if (active) setHasMore(older.length > 0); })
      .catch(() => { if (active) setHasMore(false); });
    return () => { active = false; };
  }, [apiBase, refreshKey, usingExplicitRange, windowFrom]);

  async function loadMore() {
    setLoadingMore(true);
    const nextFrom = daysBefore(windowFrom, DEFAULT_WINDOW_DAYS);
    try {
      const data = await api.get(apiBase, { from: startOfDayISO(nextFrom), to: endOfDayISO(todayKey()) });
      setEntries(data);
      setWindowFrom(nextFrom);
    } finally {
      setLoadingMore(false);
    }
  }

  function formatDate(key) {
    const today = new Date().toLocaleDateString("en-CA");
    if (key === today) return t("meal.today");
    return new Date(`${key}T00:00:00`).toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  // Date range is already applied server-side (see the fetch effect above) —
  // these are quick client-side toggles on top of whatever window is loaded.
  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e) =>
      (!category || e.category === category) &&
      (!symptomsOnly || e.hasSymptoms) &&
      (!mealGuideOnly || e.compliance === "yes")
    );
  }, [entries, category, symptomsOnly, mealGuideOnly]);

  // Most recent day first — today's meals at the top, not buried below older days.
  const days = useMemo(() => [...new Set(filtered.map((e) => dayKey(e.eatenAt)))].sort((a, b) => (a < b ? 1 : -1)), [filtered]);

  // Within each day, earliest meal on top, latest at the bottom — the order
  // the client actually ate, not the API's latest-first order.
  const byDay = useMemo(() => {
    const map = {};
    for (const d of days) {
      map[d] = filtered
        .filter((e) => dayKey(e.eatenAt) === d)
        .sort((a, b) => new Date(a.eatenAt) - new Date(b.eatenAt));
    }
    return map;
  }, [filtered, days]);

  return (
    <>
      <AppHeader title={t("module.nutrition").toUpperCase()} showBack={isCoach} backTo={isCoach ? "/coach" : null} showLogo={false} />

      <div className="flex-1 overflow-y-auto bg-muted">
        {!entries ? <ListSkeleton /> : days.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <UtensilsCrossed className="w-12 h-12 text-ink/20 mb-4" />
            <p className="font-heading uppercase text-ink/50">{t("entry.noEntries")}</p>
          </div>
        ) : (
          days.map((d) => (
            <section key={d}>
              <h2 className="sticky top-0 z-10 bg-ink/90 text-white px-4 py-2 font-heading uppercase tracking-wide text-sm">{formatDate(d)}</h2>
              <div className="p-3 space-y-3">
                {byDay[d].map((e) => (
                  <Link key={e.id} to={`${linkBase}/${e.id}`} className={`relative flex gap-3 bg-white border-2 p-3 hover:border-primary ${e.id === activeId ? "border-primary" : "border-border"}`}>
                    <div className="relative w-20 h-20 shrink-0">
                      {e.photos?.[0]
                        ? <AuthImage path={`/photos/${e.photos[0].thumbKey}`} className="w-20 h-20 object-cover border-2 border-border" />
                        : <div className="w-20 h-20 border-2 border-border bg-muted" />}
                      {e.photos?.length > 1 && (
                        <span className="absolute -bottom-1 -right-1 bg-primary text-white text-xs font-bold px-1">+{e.photos.length - 1}</span>
                      )}
                    </div>
                    <div className={`flex-1 min-w-0 ${e.compliance === "yes" ? "pr-8" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-heading uppercase tracking-wide font-bold">{t(`category.${e.category}`)}</span>
                        {e.hasSymptoms && <AlertCircle className="w-4 h-4 text-danger shrink-0" />}
                      </div>
                      {e.description && <p className="text-sm text-ink/70 mt-1 line-clamp-2">{e.description}</p>}
                      <div className="flex items-center gap-1 text-sm font-bold text-ink mt-2"><Clock className="w-4 h-4" />{timeOf(e.eatenAt)}</div>
                    </div>
                    {e.compliance === "yes" && (
                      <span
                        role="img"
                        aria-label={t("meal.complianceYes")}
                        className="absolute bottom-2 right-2 flex items-center justify-center"
                      >
                        <Check className="w-6 h-6 text-success" strokeWidth={3} />
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
        {entries && hasMore && (
          <div className="p-3">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full min-h-[44px] border-2 border-border bg-white font-heading uppercase tracking-wide text-sm text-ink/70 disabled:opacity-50"
            >
              {loadingMore ? t("common.loading") : t("meal.loadMore")}
            </button>
          </div>
        )}
      </div>

      {filterOpen && (
        <div className="bg-muted border-t-2 border-primary p-3 space-y-3">
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
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={mealGuideOnly} onChange={(e) => setMealGuideOnly(e.target.checked)} className="w-5 h-5" />
            <span className="text-sm font-medium">{t("meal.mealGuideOnly")}</span>
          </label>
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 font-heading uppercase tracking-wide text-sm">
              <Calendar className="w-4 h-4" />{t("meal.dateRange")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-xs text-ink/50 uppercase tracking-wide mb-1">{t("meal.from")}</span>
                <input type="date" value={dayFrom} max={dayTo || undefined} onChange={(e) => setDayFrom(e.target.value)}
                  className="w-full min-h-[44px] px-3 border-2 border-border rounded-none font-bold bg-white text-sm focus:outline-none focus:border-primary" />
              </label>
              <label className="block">
                <span className="block text-xs text-ink/50 uppercase tracking-wide mb-1">{t("meal.to")}</span>
                <input type="date" value={dayTo} min={dayFrom || undefined} onChange={(e) => setDayTo(e.target.value)}
                  className="w-full min-h-[44px] px-3 border-2 border-border rounded-none font-bold bg-white text-sm focus:outline-none focus:border-primary" />
              </label>
            </div>
            {(dayFrom || dayTo) && (
              <button
                onClick={() => { setDayFrom(""); setDayTo(""); }}
                className="flex items-center gap-1 px-3 min-h-[36px] border-2 border-border text-xs font-heading uppercase tracking-wide bg-white"
              >
                <X className="w-3.5 h-3.5" />{t("meal.clearDay")}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 z-30 border-t-2 border-border bg-white p-3 flex items-center justify-center gap-6">
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
