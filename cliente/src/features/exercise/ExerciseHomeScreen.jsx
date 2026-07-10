import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Filter } from "lucide-react";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { api } from "../../lib/api.js";
import { useExerciseScope } from "./useExerciseScope.js";
import { DAY_NAMES, readWeekStartsOn, writeWeekStartsOn } from "./weekStartsOn.js";

export function ExerciseHomeScreen() {
  const { t } = useTranslation();
  const { isCoach, clientId, statsBase } = useExerciseScope();
  const [stats, setStats] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [weekStartsOn, setWeekStartsOn] = useState(readWeekStartsOn);

  // Stats are bucketed server-side by calendar day — send this browser's own
  // timeZone (and the weekStartsOn preference below) so "today"/"this week"
  // match what this user sees everywhere else in the app, not the server's.
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setStats(null);
    api.get(statsBase, { timeZone, weekStartsOn }).then(setStats).catch(() => setStats(false));
  }, [statsBase, weekStartsOn]);

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

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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

            <section className="border-2 border-border p-4">
              <h2 className="font-heading uppercase tracking-wide text-sm text-ink/60 mb-3">{t("exercise.weeklyChart")}</h2>
              <div className="relative h-32">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                  <polyline
                    points={stats.weeklyChart
                      .map((w, i) => `${(i / Math.max(1, stats.weeklyChart.length - 1)) * 100},${100 - (w.days / 7) * 100}`)
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
                {stats.weeklyChart.map((w, i) => (
                  <div
                    key={w.week}
                    title={`${t("exercise.week")} ${w.week}: ${w.days}`}
                    className="absolute w-2 h-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary"
                    style={{
                      left: `${(i / Math.max(1, stats.weeklyChart.length - 1)) * 100}%`,
                      bottom: `${(w.days / 7) * 100}%`,
                    }}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
