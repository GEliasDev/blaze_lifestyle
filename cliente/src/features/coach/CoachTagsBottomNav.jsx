import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tag, Plus } from "lucide-react";

const ITEM = "flex-1 flex items-center justify-center min-h-[56px]";

// Persistent nav for the coach's tags section, same pattern as
// NutritionBottomNav/ExerciseBottomNav: left = list, right = add.
export function CoachTagsBottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="sticky bottom-0 z-30 bg-white border-t-2 border-border flex">
      <NavLink to="/coach/tags" end aria-label={t("exercise.manageTags")} className={({ isActive }) => `${ITEM} ${isActive ? "text-primary" : "text-ink/60"}`}>
        <Tag className="w-6 h-6" />
      </NavLink>
      <NavLink to="/coach/tags/add" aria-label={t("exercise.newTag")} className={({ isActive }) => `${ITEM} ${isActive ? "text-primary" : "text-ink/60"}`}>
        <Plus className="w-6 h-6" />
      </NavLink>
    </nav>
  );
}
