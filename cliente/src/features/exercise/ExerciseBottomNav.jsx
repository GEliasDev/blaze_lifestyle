import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Calendar, Tag, Plus } from "lucide-react";

// Same 4 items for both the client and the coach (the coach has full access
// to a client's Exercise data, not read-only) — Tags stays a read-only list
// here either way; managing tags (create/delete) lives in the coach's global
// /coach/tags screen instead.
export function ExerciseBottomNav({ linkBase }) {
  const { t } = useTranslation();
  const items = [
    { to: "", icon: Home, key: "exercise.navHome", end: true },
    { to: "calendar", icon: Calendar, key: "exercise.navCalendar" },
    { to: "tags", icon: Tag, key: "exercise.navTags" },
    { to: "add", icon: Plus, key: "exercise.navAdd" },
  ];
  return (
    <nav className="sticky bottom-0 z-30 bg-white border-t-2 border-border flex">
      {items.map(({ to, icon: Icon, key, end }) => (
        <NavLink
          key={key}
          to={`${linkBase}${to ? `/${to}` : ""}`}
          end={end}
          aria-label={t(key)}
          className={({ isActive }) =>
            `flex-1 flex items-center justify-center min-h-[56px] ${isActive ? "text-primary" : "text-ink/60"}`
          }
        >
          <Icon className="w-6 h-6" />
        </NavLink>
      ))}
    </nav>
  );
}
