import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { api } from "../../lib/api.js";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];
const field = "w-full p-2 border-2 border-border rounded-none";

export function PlanEditorScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [item, setItem] = useState({ category: "Breakfast", title: "", dayOfWeek: 1 });

  const load = useCallback(() => { api.get(`/coach/clients/${id}/plan`).then((d) => setData(d ?? { plan: null, items: [] })).catch(() => setData({ plan: null, items: [] })); }, [id]);
  useEffect(() => { load(); }, [load]);
  if (!data) return <Spinner />;

  async function createPlan(e) { e.preventDefault(); await api.post(`/coach/clients/${id}/plan`, { name, startDate }); load(); }
  async function addItem(e) { e.preventDefault(); await api.post(`/coach/plans/${data.plan.id}/items`, { category: item.category, title: item.title, dayOfWeek: Number(item.dayOfWeek) }); setItem({ ...item, title: "" }); load(); }
  async function delItem(itemId) { await api.del(`/coach/plan-items/${itemId}`); load(); }

  if (!data.plan) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="font-heading uppercase tracking-wide text-2xl">{t("coach.newPlan")}</h1>
        <form onSubmit={createPlan} className="space-y-3 max-w-md">
          <input className={field} placeholder="Plan" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="date" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <Button type="submit" variant="primary">{t("coach.newPlan")}</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{data.plan.name}</h1>
      <div className="space-y-2">
        {data.items.filter((i) => i.dayOfWeek != null).sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((i) => (
          <div key={i.id} className="flex justify-between items-center border-2 border-border p-3">
            <span><span className="font-heading uppercase text-xs text-ink/60">{DAYS[i.dayOfWeek]} · {t(`category.${i.category}`)}</span>{" — "}<span>{i.title}</span></span>
            <button onClick={() => delItem(i.id)} aria-label="delete" className="text-danger min-h-[44px] min-w-[44px] flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <form onSubmit={addItem} className="flex flex-wrap gap-2 items-end border-t-2 border-border pt-4">
        <select className={field + " flex-1 min-w-[120px]"} value={item.dayOfWeek} onChange={(e) => setItem({ ...item, dayOfWeek: e.target.value })}>
          {DAYS.map((d, n) => <option key={n} value={n}>{d}</option>)}
        </select>
        <select className={field + " flex-1 min-w-[120px]"} value={item.category} onChange={(e) => setItem({ ...item, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
        </select>
        <input className={field + " flex-1 min-w-[160px]"} placeholder={t("coach.addItem")} value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} required />
        <Button type="submit" variant="primary">{t("coach.addItem")}</Button>
      </form>
    </div>
  );
}
