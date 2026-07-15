import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { api } from "../../lib/api.js";
import { useExerciseScope } from "./useExerciseScope.js";
import { DAY_NAMES, readWeekStartsOn, writeWeekStartsOn } from "./weekStartsOn.js";

// Fixed px spacing per week (rather than stretching all weeks-so-far across
// whatever width is available) keeps points legibly spaced and tappable once
// the year is a few months in — the chart scrolls horizontally instead of
// compressing, see weeklyChart in exercise.service.js (one entry per elapsed
// week, up to 52).
const WEEK_PX = 32;
const GRID_DAYS = [0, 1, 2, 3, 4, 5, 6, 7];

// Reserves a margin at the top/bottom of the plot so the 0 and 7 gridlines
// (and their number labels) can be centered like every other one instead of
// getting anchored to the box edge — that anchoring is what previously made
// the 6-7 gap look uneven and pushed the lines off-center from their labels.
// Gridlines, axis numbers, dots and the polyline all go through this same
// mapping so a "7 days" point actually lands exactly on the "7" line.
const CHART_PAD_PCT = 6;
function dayBottomPct(days) {
  return CHART_PAD_PCT + (days / 7) * (100 - 2 * CHART_PAD_PCT);
}

// Same pattern as PhotoCarousel.jsx — hides the native scrollbar (which on
// some browsers/OSes renders as chunky arrow-button bars, clashing with the
// brutalist thin-border look) while still allowing touch/trackpad/drag scroll.
const HIDE_SCROLLBAR = "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function ExerciseHomeScreen() {
  const { t, i18n } = useTranslation();
  const { isCoach, clientId, statsBase } = useExerciseScope();
  const [stats, setStats] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [weekStartsOn, setWeekStartsOn] = useState(readWeekStartsOn);
  const [chartMode, setChartMode] = useState("weeks");
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [activePoint, setActivePoint] = useState(null);

  // One label per month boundary crossed by the elapsed weeks — weeklyChart's
  // `week` is 1-based from that year's Jan 1 (see exercise.service.js), so
  // each week's start date is derivable without another API round trip.
  // Uses stats.chartYear (the year the server actually computed, clamped
  // server-side) rather than chartYear directly, so labels can't drift out
  // of sync with the data mid-request.
  const monthTicks = useMemo(() => {
    if (!stats || !stats.weeklyChart.length) return [];
    const yearStart = new Date(stats.chartYear, 0, 1);
    const ticks = [];
    let lastMonth = null;
    stats.weeklyChart.forEach((w, i) => {
      const weekStart = new Date(yearStart.getTime() + (w.week - 1) * 7 * 86400000);
      const month = weekStart.getMonth();
      if (month !== lastMonth) {
        ticks.push({ index: i, label: weekStart.toLocaleDateString(i18n.language, { month: "short" }) });
        lastMonth = month;
      }
    });
    return ticks;
  }, [stats, i18n.language]);

  // Months view: always all 12 months (unlike weeklyChart, which only has
  // elapsed weeks) — each point is the average of that month's weekly `days`
  // values, still on the same 0-7 scale as the weekly view's gridlines.
  // Computed client-side from weeklyChart (same week->month derivation as
  // monthTicks above) rather than a new endpoint.
  const monthlyChart = useMemo(() => {
    if (!stats) return [];
    const yearStart = new Date(stats.chartYear, 0, 1);
    const buckets = Array.from({ length: 12 }, () => ({ sum: 0, count: 0 }));
    stats.weeklyChart.forEach((w) => {
      const weekStart = new Date(yearStart.getTime() + (w.week - 1) * 7 * 86400000);
      const b = buckets[weekStart.getMonth()];
      b.sum += w.days;
      b.count += 1;
    });
    return buckets.map((b, month) => ({
      month,
      label: new Date(yearStart.getFullYear(), month, 1).toLocaleDateString(i18n.language, { month: "short" }),
      avg: b.count ? b.sum / b.count : 0,
    }));
  }, [stats, i18n.language]);

  // Stats are bucketed server-side by calendar day — send this browser's own
  // timeZone (and the weekStartsOn preference below) so "today"/"this week"
  // match what this user sees everywhere else in the app, not the server's.
  // `year` only affects weeklyChart — the Year/Week Progress cards always
  // stay pinned to the real current year regardless of chartYear.
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setStats(null);
    setActivePoint(null);
    api.get(statsBase, { timeZone, weekStartsOn, year: chartYear }).then(setStats).catch(() => setStats(false));
  }, [statsBase, weekStartsOn, chartYear]);

  function changeChartMode(mode) {
    setChartMode(mode);
    setActivePoint(null);
  }

  // Bounded to [registeredYear, currentYear] once stats has loaded — the
  // server clamps too (see exercise.service.js), this just keeps the arrows
  // from being tappable past that range in the first place.
  function changeChartYear(year) {
    if (!stats || year < stats.registeredYear || year > stats.currentYear) return;
    setChartYear(year);
    setActivePoint(null);
  }

  function changeWeekStartsOn(day) {
    setWeekStartsOn(day);
    writeWeekStartsOn(day);
  }

  const filterAction = (
    <button
      onClick={() => setFilterOpen((v) => !v)}
      aria-label={t("nav.filter")}
      aria-pressed={filterOpen}
      className={`min-h-[44px] min-w-[44px] flex items-center justify-center ${filterOpen ? "text-primary" : "text-white/80"}`}
    >
      <Filter className="w-6 h-6" />
    </button>
  );

  return (
    <>
      <AppHeader
        title={t("exercise.tracker").toUpperCase()}
        showBack={isCoach}
        backTo={isCoach ? `/coach/clients/${clientId}` : null}
        desktopBackTo={isCoach ? "/coach" : null}
        action={filterAction}
      />

      {filterOpen && (
        <div className="bg-muted border-b-2 border-primary p-3 space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.weekStartsOn")}</h3>
          <div className="flex flex-wrap gap-2">
            {DAY_NAMES.map((d, i) => (
              <button
                key={d}
                onClick={() => changeWeekStartsOn(i)}
                aria-pressed={weekStartsOn === i}
                className={`px-3 min-h-[36px] border-2 text-xs font-heading uppercase tracking-wide ${weekStartsOn === i ? "bg-primary text-white border-primary" : "bg-white text-ink border-border"}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col">
        {stats === null ? <Spinner /> : stats === false ? (
          <p className="text-ink/50 text-sm text-center p-8">{t("common.error")}</p>
        ) : (
          <>
            <section className="border-2 border-border p-4 text-center">
              <h2 className="font-heading uppercase tracking-wide text-sm text-ink/60 mb-2">{t("exercise.yearProgress")}</h2>
              <div className="font-heading text-3xl font-bold">{stats.yearTrainedDays}/{stats.yearElapsedDays}</div>
              <p className="text-ink/60 text-sm">{t("exercise.daysTrained")}</p>
              <div className="mt-3 h-2 bg-ink/10">
                <div className="h-2 bg-primary" style={{ width: `${Math.min(100, Math.round((stats.yearTrainedDays / stats.yearElapsedDays) * 100))}%` }} />
              </div>
            </section>

            <section className="border-2 border-border p-4 text-center">
              <h2 className="font-heading uppercase tracking-wide text-sm text-ink/60 mb-2">{t("exercise.weekProgress")}</h2>
              <div className="font-heading text-3xl font-bold">{stats.weekTrainedDays}/{stats.weekElapsedDays}</div>
              <p className="text-ink/60 text-sm">{t("exercise.daysTrained")}</p>
              <div className="mt-3 h-2 bg-ink/10">
                <div className="h-2 bg-primary" style={{ width: `${Math.min(100, Math.round((stats.weekTrainedDays / stats.weekElapsedDays) * 100))}%` }} />
              </div>
            </section>

            {/* flex-1 min-h-0: grows to fill whatever's left down to the
                bottom nav instead of sitting at a fixed height with empty
                space below it — see NutritionLayout for the same pattern. */}
            <section className="border-2 border-border p-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="font-heading uppercase tracking-wide text-base text-ink/60">{t("exercise.weeklyChart")}</h2>
                <div className="flex border-2 border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => changeChartMode("months")}
                    aria-pressed={chartMode === "months"}
                    className={`px-3 min-h-[32px] text-xs font-heading uppercase tracking-wide ${chartMode === "months" ? "bg-primary text-white" : "bg-white text-ink"}`}
                  >
                    {t("exercise.chartMonths")}
                  </button>
                  <button
                    type="button"
                    onClick={() => changeChartMode("weeks")}
                    aria-pressed={chartMode === "weeks"}
                    className={`px-3 min-h-[32px] text-xs font-heading uppercase tracking-wide border-l-2 border-border ${chartMode === "weeks" ? "bg-primary text-white" : "bg-white text-ink"}`}
                  >
                    {t("exercise.chartWeeks")}
                  </button>
                </div>
              </div>
              {stats && (
                <div className="flex items-center justify-center gap-3 mb-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => changeChartYear(chartYear - 1)}
                    disabled={chartYear <= stats.registeredYear}
                    aria-label={t("exercise.prevYear")}
                    className="min-h-[32px] min-w-[32px] flex items-center justify-center text-ink disabled:opacity-30"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-heading text-sm tabular-nums">{stats.chartYear}</span>
                  <button
                    type="button"
                    onClick={() => changeChartYear(chartYear + 1)}
                    disabled={chartYear >= stats.currentYear}
                    aria-label={t("exercise.nextYear")}
                    className="min-h-[32px] min-w-[32px] flex items-center justify-center text-ink disabled:opacity-30"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              {(() => {
                const points = chartMode === "months"
                  ? monthlyChart.map((m) => ({ key: m.month, value: m.avg, label: m.label }))
                  : stats.weeklyChart.map((w) => ({ key: w.week, value: w.days, label: null }));
                const xAxisLabels = chartMode === "months"
                  ? monthlyChart.map((m) => ({ index: m.month, label: m.label }))
                  : monthTicks;
                // Minimum px per point — guarantees mobile spacing/scroll
                // stays legible when there are many points, but the plot
                // area's actual width is `max(100%, points*minPx)` (see
                // below), so on desktop — where 100% is already wider than
                // that floor — it fills the full card instead of leaving
                // dead space, with points/gridlines spread via % so they
                // still land correctly either way.
                const minPointPx = chartMode === "months" ? 36 : WEEK_PX;
                const active = activePoint !== null ? points[activePoint] : null;
                const n = Math.max(points.length, 1);
                return (
                  <>
                    <div className="flex-1 flex gap-2 min-h-56">
                      {/* Fixed (non-scrolling) day-count axis. Split into the
                          same flex-1-plot + fixed-label-strip shape as the
                          scrollable side so its GRID_DAYS bottoms land on the
                          exact same pixel rows as the gridlines next to it. */}
                      <div className="w-3 shrink-0 flex flex-col">
                        <div className="relative flex-1 min-h-0">
                          {GRID_DAYS.map((d) => (
                            <span
                              key={d}
                              className="absolute right-0 -translate-y-1/2 text-[10px] leading-none text-ink/40 font-heading"
                              style={{ bottom: `${dayBottomPct(d)}%` }}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                        <div className="h-5 mt-1 shrink-0" />
                      </div>
                      <div className={`overflow-x-auto flex-1 min-w-0 ${HIDE_SCROLLBAR}`}>
                        <div className="h-full flex flex-col" style={{ width: `max(100%, ${points.length * minPointPx}px)` }}>
                          <div className="relative flex-1 min-h-0">
                            {GRID_DAYS.map((d) => (
                              <div
                                key={d}
                                className="absolute inset-x-0 border-t border-ink/10"
                                style={{ bottom: `${dayBottomPct(d)}%` }}
                              />
                            ))}
                            <svg
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                              className="absolute inset-0 w-full h-full"
                            >
                              <polyline
                                points={points
                                  .map((p, i) => `${((i + 0.5) / n) * 100},${100 - dayBottomPct(p.value)}`)
                                  .join(" ")}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                vectorEffect="non-scaling-stroke"
                                className="text-primary"
                              />
                            </svg>
                            {points.map((p, i) => (
                              <button
                                type="button"
                                key={p.key}
                                onClick={() => setActivePoint(activePoint === i ? null : i)}
                                aria-pressed={activePoint === i}
                                aria-label={chartMode === "months" ? `${p.label}: ${p.value.toFixed(1)}` : `${t("exercise.week")} ${p.key}: ${p.value}`}
                                className="absolute -translate-x-1/2 translate-y-1/2 p-2"
                                style={{ left: `${((i + 0.5) / n) * 100}%`, bottom: `${dayBottomPct(p.value)}%` }}
                              >
                                <span className={`block w-2 h-2 rounded-full ${activePoint === i ? "bg-ink" : "bg-primary"}`} />
                              </button>
                            ))}
                          </div>
                          <div className="relative h-5 mt-1 shrink-0">
                            {/* left must use the same (index + 0.5) / n
                                centering as the points/svg above — using the
                                slot's start instead of its center (a bug from
                                when this was still px-based) shifted every
                                label a half-slot away from the point/gridline
                                it's actually labeling. */}
                            {xAxisLabels.map((mt) => (
                              <div key={mt.index} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${((mt.index + 0.5) / n) * 100}%` }}>
                                <span className="block w-px h-1.5 bg-ink/20" />
                                {/* text-[10px]+tracking-wide on a condensed uppercase
                                    font reads as mush on mobile ("JUN" -> "JIIN") —
                                    text-xs with normal tracking stays legible. */}
                                <span className="block mt-0.5 text-xs leading-none text-ink/60 font-heading uppercase whitespace-nowrap">
                                  {mt.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    {active && (
                      <p className="mt-3 text-sm font-heading uppercase tracking-wide shrink-0">
                        {chartMode === "months" ? active.label : `${t("exercise.week")} ${active.key}`}: {chartMode === "months" ? active.value.toFixed(1) : active.value}/7 {t("exercise.daysTrained")}
                      </p>
                    )}
                  </>
                );
              })()}
            </section>
          </>
        )}
      </div>
    </>
  );
}
