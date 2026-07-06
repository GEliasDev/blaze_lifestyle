import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Calendar, Tag, Plus } from "lucide-react";

// Coach mode (isCoach=true) only gets Home + Calendar — Add and Tags are
// client-only actions (see exercise.route.js: those endpoints don't even
// exist under /api/coach).
export function ExerciseBottomNav({ linkBase, isCoach }) {
  const { t } = useTranslation();
  const items = isCoach
    ? [
        { to: "", icon: Home, key: "exercise.navHome", end: true },
        { to: "calendar", icon: Calendar, key: "exercise.navCalendar" },
      ]
    : [
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
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center min-h-[56px] gap-1 font-heading uppercase tracking-wide text-xs ${isActive ? "text-primary" : "text-ink/60"}`
          }
        >
          <Icon className="w-5 h-5" />
          {t(key)}
        </NavLink>
      ))}
    </nav>
  );
}
