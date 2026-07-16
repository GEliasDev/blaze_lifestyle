import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, ChevronLeft, ChevronRight, Clock, Filter, Search, X } from "lucide-react";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { api } from "../../lib/api.js";
import { useExerciseScope } from "./useExerciseScope.js";
import { DAY_NAMES, readWeekStartsOn } from "./weekStartsOn.js";
import { FEELINGS } from "./feelings.js";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function startOfDayISO(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString(); }
function endOfDayISO(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x.toISOString(); }
function dayKey(iso) { return new Date(iso).toLocaleDateString("en-CA"); }

// Month grid starting on whichever day the "week starts on" filter picked
// (defaults to Monday, matching the mockup's default weekStartsOn=1).
function getCalendarDays(monthDate, weekStartsOn) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  const dow = (firstDay.getDay() - weekStartsOn + 7) % 7;
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
  // Default to today selected, matching the initial month shown, instead of
  // making the user tap a day before seeing anything.
  const [selectedDay, setSelectedDay] = useState(new Date());
  // The "week starts on" filter lives on the Home screen (ExerciseHomeScreen)
  // but applies here too — read whatever was last stored there.
  const [weekStartsOn] = useState(readWeekStartsOn);

  const [filterOpen, setFilterOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState([]);
  const [tagQuery, setTagQuery] = useState("");
  const [feelingFilter, setFeelingFilter] = useState([]);
  const [injuryOnly, setInjuryOnly] = useState(false);

  const adjustedDayNames = [...DAY_NAMES.slice(weekStartsOn), ...DAY_NAMES.slice(0, weekStartsOn)];
  const calendarDays = useMemo(() => getCalendarDays(monthDate, weekStartsOn), [monthDate, weekStartsOn]);

  useEffect(() => {
    const from = calendarDays[0];
    const to = calendarDays[calendarDays.length - 1];
    setEntries(null);
    api.get(apiBase, { from: startOfDayISO(from), to: endOfDayISO(to) }).then(setEntries).catch(() => setEntries(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, monthDate]);

  // Filters apply on top of whatever month is already loaded — same
  // client-side pattern as Nutrition's list filters (NutritionScreen.jsx).
  const filteredEntries = useMemo(() => {
    if (!Array.isArray(entries)) return [];
    return entries.filter((e) =>
      (tagFilter.length === 0 || e.tags.some((tag) => tagFilter.includes(tag.id))) &&
      (feelingFilter.length === 0 || feelingFilter.includes(e.feeling)) &&
      (!injuryOnly || e.hasAlert)
    );
  }, [entries, tagFilter, feelingFilter, injuryOnly]);

  const entriesByDay = useMemo(() => {
    const map = {};
    for (const e of filteredEntries) {
      const k = dayKey(e.exercisedAt);
      (map[k] ??= []).push(e);
    }
    return map;
  }, [filteredEntries]);

  function toggleTagFilter(id) {
    setTagFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Only offer tags the client has actually used this month — not the full
  // global tag list — so the picker never shows a tag that would just filter
  // everything out.
  const usedTags = useMemo(() => {
    if (!Array.isArray(entries)) return [];
    const byId = new Map();
    for (const e of entries) for (const tag of e.tags) byId.set(tag.id, tag);
    return [...byId.values()];
  }, [entries]);

  // Selected tags collapse into removable chips (same pattern as
  // ExerciseTagPicker) — the search/list below only ever offers tags not
  // already picked, instead of showing every tag flat all the time.
  const selectedTags = usedTags.filter((tag) => tagFilter.includes(tag.id));
  const unselectedTags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    return usedTags
      .filter((tag) => !tagFilter.includes(tag.id))
      .filter((tag) => !q || tag.name.toLowerCase().includes(q));
  }, [usedTags, tagFilter, tagQuery]);

  function toggleFeelingFilter(value) {
    setFeelingFilter((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  function navigateMonth(delta) {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + delta);
    setMonthDate(d);
    setSelectedDay(null);
  }

  const selectedKey = selectedDay ? selectedDay.toLocaleDateString("en-CA") : null;
  const selectedEntries = selectedKey ? (entriesByDay[selectedKey] ?? []) : [];

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
        title={t("exercise.calendar").toUpperCase()}
        showBack={isCoach}
        backTo={isCoach ? `/coach/clients/${clientId}` : null}
        desktopBackTo={isCoach ? "/coach" : null}
        action={filterAction}
      />

      {filterOpen && (
        <div className="bg-muted border-b-2 border-primary p-3 space-y-3">
          <div className="space-y-2">
            <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.tag")}</h3>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTagFilter(tag.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-heading uppercase tracking-wide bg-${tag.color} text-white`}
                  >
                    {tag.name}<X className="w-4 h-4" />
                  </button>
                ))}
              </div>
            )}
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
              <input
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                placeholder={t("exercise.searchTags")}
                aria-label={t("exercise.searchTags")}
                className="w-full p-3 pl-10 border-2 border-border rounded-none bg-white"
              />
            </label>
            <div className="max-h-40 overflow-y-auto border-2 border-border divide-y-2 divide-border bg-white">
              {unselectedTags.length === 0 ? (
                <p className="p-3 text-sm text-ink/50 text-center">{t("exercise.noTagsFound")}</p>
              ) : (
                unselectedTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTagFilter(tag.id)}
                    className="w-full flex items-center gap-3 p-3 text-left min-h-[44px] bg-white text-ink"
                  >
                    <span className={`w-4 h-4 shrink-0 bg-${tag.color}`} />
                    <span className="font-heading uppercase tracking-wide font-bold">{tag.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.biofeedback")}</h3>
            <div className="flex gap-2">
              {FEELINGS.map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleFeelingFilter(value)}
                  aria-label={t(labelKey)}
                  aria-pressed={feelingFilter.includes(value)}
                  className={`flex-1 min-h-[44px] flex items-center justify-center border-2 ${feelingFilter.includes(value) ? "bg-primary text-white border-primary" : "bg-white text-ink border-border"}`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.alertLabel")}</h3>
            <button
              type="button"
              onClick={() => setInjuryOnly((v) => !v)}
              aria-pressed={injuryOnly}
              className={`w-full px-3 min-h-[44px] border-2 font-heading uppercase tracking-wide flex items-center justify-center gap-2 ${injuryOnly ? "bg-danger text-white border-danger" : "bg-white text-ink border-border"}`}
            >
              <AlertCircle className="w-5 h-5" />{t("exercise.injuryOnly")}
            </button>
          </div>
        </div>
      )}

      {/* scrollbar-gutter reserves the scrollbar's width up front, so the
          centered calendar below doesn't shift sideways when the entries
          list grows enough to make this pane scroll. */}
      <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between p-3 border-b-2 border-border">
            <button onClick={() => navigateMonth(-1)} aria-label={t("common.back")} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-heading uppercase tracking-wide text-lg">{MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}</h2>
            <button onClick={() => navigateMonth(1)} aria-label={t("exercise.nextMonth")} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3 border-b-2 border-border">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {adjustedDayNames.map((d) => <div key={d} className="text-center text-xs font-heading uppercase text-ink/50">{d}</div>)}
            </div>
            {entries === null ? <Spinner /> : entries === false ? (
              <p className="text-ink/50 text-sm text-center py-8">{t("common.error")}</p>
            ) : (
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
                      className={`aspect-square rounded-full flex items-center justify-center text-sm border-2 ${isCurrentMonth ? (hasEntries ? `bg-primary text-white ${isSelected ? "border-ink" : "border-primary"}` : isSelected ? "border-ink bg-transparent text-ink" : "border-transparent text-ink") : "text-ink/30 border-transparent"}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
                <div className="flex items-center gap-2">
                  <span className="font-heading uppercase tracking-wide font-bold">{entry.title}</span>
                  {entry.hasAlert && <AlertCircle className="w-4 h-4 text-danger shrink-0" />}
                </div>
                <p className="text-sm text-ink/70 line-clamp-2">{entry.description}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
