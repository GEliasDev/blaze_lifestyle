import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { api } from "../../lib/api.js";
import { useExerciseScope } from "./useExerciseScope.js";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfDayISO(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString(); }
function endOfDayISO(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x.toISOString(); }
function dayKey(iso) { return new Date(iso).toLocaleDateString("en-CA"); }

// Month grid starting on Monday, matching the mockup's default weekStartsOn=1.
function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  const dow = (firstDay.getDay() + 6) % 7;
  startDate.setDate(startDate.getDate() - dow);
  const weeksNeeded = Math.ceil((dow + lastDay.getDate()) / 7);
  const days = [];
  const cur = new Date(startDate);
  for (let i = 0; i < weeksNeeded * 7; i++) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return days;
}

export function ExerciseCalendarScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isCoach, clientId, apiBase, linkBase } = useExerciseScope();
  const [monthDate, setMonthDate] = useState(new Date());
  const [entries, setEntries] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const calendarDays = useMemo(() => getCalendarDays(monthDate), [monthDate]);

  useEffect(() => {
    const from = calendarDays[0];
    const to = calendarDays[calendarDays.length - 1];
    setEntries(null);
    api.get(apiBase, { from: startOfDayISO(from), to: endOfDayISO(to) }).then(setEntries).catch(() => setEntries([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, monthDate]);

  const entriesByDay = useMemo(() => {
    const map = {};
    for (const e of entries ?? []) {
      const k = dayKey(e.exercisedAt);
      (map[k] ??= []).push(e);
    }
    return map;
  }, [entries]);

  function navigateMonth(delta) {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + delta);
    setMonthDate(d);
    setSelectedDay(null);
  }

  const selectedKey = selectedDay ? selectedDay.toLocaleDateString("en-CA") : null;
  const selectedEntries = selectedKey ? (entriesByDay[selectedKey] ?? []) : [];

  return (
    <>
      <AppHeader
        title={t("exercise.calendar").toUpperCase()}
        showBack={isCoach}
        backTo={isCoach ? `/coach/clients/${clientId}` : null}
        desktopBackTo={isCoach ? "/coach" : null}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b-2 border-border">
          <button onClick={() => navigateMonth(-1)} aria-label={t("common.back")} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-heading uppercase tracking-wide text-lg">{MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}</h2>
          <button onClick={() => navigateMonth(1)} aria-label={t("exercise.nextMonth")} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b-2 border-border">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_NAMES.map((d) => <div key={d} className="text-center text-xs font-heading uppercase text-ink/50">{d}</div>)}
          </div>
          {entries === null ? <Spinner /> : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, i) => {
                const isCurrentMonth = date.getMonth() === monthDate.getMonth();
                const key = date.toLocaleDateString("en-CA");
                const hasEntries = Boolean(entriesByDay[key]?.length);
                const isSelected = selectedKey === key;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(date)}
                    className={`aspect-square flex items-center justify-center text-sm border-2 ${isCurrentMonth ? "text-ink" : "text-ink/30 border-transparent"} ${isSelected ? "border-primary" : hasEntries ? "border-ink bg-ink text-white" : "border-transparent"}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {!selectedDay ? (
            <p className="text-ink/50 text-sm text-center py-8">{t("exercise.selectDay")}</p>
          ) : selectedEntries.length === 0 ? (
            <p className="text-ink/50 text-sm text-center py-8">{t("exercise.noEntriesDay")}</p>
          ) : (
            selectedEntries.map((entry) => (
              <button key={entry.id} onClick={() => navigate(`${linkBase}/${entry.id}`)} className="w-full text-left bg-white border-2 border-border p-3 hover:border-primary">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <span key={tag.id} className={`px-2 py-0.5 text-xs text-white bg-${tag.color}`}>{tag.name}</span>
                    ))}
                  </div>
                  <span className="text-xs text-ink/50 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(entry.exercisedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {entry.photos[0] && <AuthImage path={`/photos/${entry.photos[0].thumbKey}`} className="w-16 h-16 object-cover border-2 border-border mb-2" />}
                <p className="text-sm">{entry.description}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
