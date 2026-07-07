import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, Plus } from "lucide-react";

const ITEM = "flex-1 flex items-center justify-center min-h-[56px]";

// Persistent module nav, mobile-only (desktop already shows the list
// permanently in the master pane — see NutritionLayout.jsx). Mirrors
// ExerciseBottomNav's style: left = list, right = add entry. Icon-only,
// no text labels — aria-label carries the accessible name instead.
export function NutritionBottomNav({ linkBase }) {
  const { t } = useTranslation();
  return (
    <nav className="lg:hidden sticky bottom-0 z-30 bg-white border-t-2 border-border flex">
      <NavLink to={linkBase} end aria-label={t("nav.timeline")} className={({ isActive }) => `${ITEM} ${isActive ? "text-primary" : "text-ink/60"}`}>
        <BookOpen className="w-6 h-6" />
      </NavLink>
      <NavLink to={`${linkBase}/add`} aria-label={t("nav.add")} className={({ isActive }) => `${ITEM} ${isActive ? "text-primary" : "text-ink/60"}`}>
        <Plus className="w-6 h-6" />
      </NavLink>
    </nav>
  );
}
