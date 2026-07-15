import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Settings, LogOut } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { COACH_NAV_ITEMS } from "../features/coach/coachNav.js";

const ROW = "flex items-center gap-3 px-4 min-h-[52px] font-heading uppercase tracking-wide text-sm";

// Persistent navigation for the coach on desktop (≥1024px) — same shell
// pattern as ClientSidebar. On mobile this is hidden and navigation lives in
// each screen's AppHeader hamburger drawer instead.
export function CoachSidebar() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  return (
    <aside className="hidden lg:flex lg:flex-col lg:h-dvh lg:sticky lg:top-0 bg-ink text-white border-r-2 border-white/10">
      <div className="p-4 border-b-2 border-white/10">
        <img src="/logo-full.webp" alt="Blaze Lifestyle" className="h-12 w-auto" />
        <div className="text-white/60 text-xs tracking-wide mt-1">COACH PANEL</div>
      </div>
      <nav className="flex-1 py-2">
        {COACH_NAV_ITEMS.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/coach"}
            className={({ isActive }) => `${ROW} ${isActive ? "text-primary" : "text-white/80"}`}
          >
            <Icon className="w-5 h-5" />{t(key)}
          </NavLink>
        ))}
      </nav>
      <div className="border-t-2 border-white/10">
        <NavLink
          to="/coach/settings"
          className={({ isActive }) => `${ROW} ${isActive ? "text-primary" : "text-white/80"}`}
        >
          <Settings className="w-5 h-5" />{t("settings.title")}
        </NavLink>
        <button onClick={logout} className={`${ROW} w-full text-white/80`}>
          <LogOut className="w-5 h-5" />{t("auth.logout")}
        </button>
      </div>
    </aside>
  );
}
