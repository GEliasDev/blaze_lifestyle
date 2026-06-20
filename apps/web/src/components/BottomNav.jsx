import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, Plus, CalendarDays, Settings } from "lucide-react";

const item = "flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 text-xs font-heading uppercase tracking-wide";
export function BottomNav() {
  const { t } = useTranslation();
  const cls = ({ isActive }) => `${item} ${isActive ? "text-primary" : "text-ink/60"}`;
  return (
    <nav className="border-t-2 border-border bg-white flex">
      <NavLink to="/home" className={cls}><ClipboardList className="w-5 h-5" />{t("nav.timeline")}</NavLink>
      <NavLink to="/add" className={cls}><Plus className="w-5 h-5" />{t("nav.add")}</NavLink>
      <NavLink to="/plan" className={cls}><CalendarDays className="w-5 h-5" />{t("nav.plan")}</NavLink>
      <NavLink to="/settings" className={cls}><Settings className="w-5 h-5" />{t("settings.title")}</NavLink>
    </nav>
  );
}
