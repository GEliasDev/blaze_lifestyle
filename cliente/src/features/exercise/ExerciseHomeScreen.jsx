import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { api } from "../../lib/api.js";
import { useExerciseScope } from "./useExerciseScope.js";

export function ExerciseHomeScreen() {
  const { t } = useTranslation();
  const { isCoach, clientId, statsBase } = useExerciseScope();
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get(statsBase).then(setStats).catch(() => setStats(false)); }, [statsBase]);

  return (
    <>
      <AppHeader
        title={t("exercise.tracker").toUpperCase()}
        showBack={isCoach}
        backTo={isCoach ? `/coach/clients/${clientId}` : null}
        desktopBackTo={isCoach ? "/coach" : null}
      />
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
              <div className="flex items-end gap-1 h-32">
                {stats.weeklyChart.map((w) => (
                  <div
                    key={w.week}
                    className="flex-1 bg-primary"
                    style={{ height: `${(w.days / 7) * 100}%`, minHeight: w.days > 0 ? "2px" : "0px" }}
                    title={`${t("exercise.week")} ${w.week}: ${w.days}`}
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
