import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];

export function MyPlanScreen() {
  const { t } = useTranslation();
  const [plan, setPlan] = useState(undefined);
  const [today, setToday] = useState([]);
  useEffect(() => {
    const date = new Date().toISOString().slice(0, 10);
    api.get("/me/plan").then(setPlan).catch(() => setPlan(null));
    api.get("/me/plan/today", { date }).then(setToday).catch(() => setToday([]));
  }, []);
  if (plan === undefined) return (<><AppHeader title={t("plan.title").toUpperCase()} /><Spinner /></>);
  if (!plan) return (<><AppHeader title={t("plan.title").toUpperCase()} /><p className="p-8 text-center font-heading uppercase text-ink/50">{t("plan.none")}</p></>);

  return (
    <>
      <AppHeader title={t("plan.title").toUpperCase()} />
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <section>
          <h3 className="font-heading uppercase tracking-wide text-sm mb-2 text-primary">{t("plan.today")}</h3>
          <div className="space-y-2">
            {today.length === 0 && <p className="text-ink/50 text-sm">—</p>}
            {today.map((r) => (
              <div key={r.itemId} className="border-2 border-primary p-3">
                <div className="font-heading uppercase text-xs text-ink/60">{t(`category.${r.category}`)}</div>
                <div className="font-medium">{r.title}</div>
                {r.notes && <div className="text-sm text-ink/60">{r.notes}</div>}
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3 className="font-heading uppercase tracking-wide text-sm mb-2">{t("plan.week")}</h3>
          <div className="space-y-2">
            {plan.items.filter((i) => i.dayOfWeek != null).sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((i) => (
              <div key={i.id} className="border-2 border-border p-3 flex justify-between">
                <span className="font-heading uppercase text-xs text-ink/60">{DAYS[i.dayOfWeek]} · {t(`category.${i.category}`)}</span>
                <span className="font-medium">{i.title}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
