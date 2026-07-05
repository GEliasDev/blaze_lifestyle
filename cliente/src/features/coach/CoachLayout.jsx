import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth.jsx";
import { Users, LogOut } from "lucide-react";

export function CoachLayout() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[260px_1fr]">
      <aside className="bg-ink text-white md:min-h-dvh">
        <div className="p-4">
          <img src="/logo-mark.png" alt="Blaze Lifestyle" className="h-8 w-auto" />
          <div className="text-white/60 text-xs tracking-wide mt-1">COACH PANEL</div>
        </div>
        <nav className="flex md:block">
          <NavLink to="/coach" end className={({ isActive }) => `flex items-center gap-2 p-4 font-heading uppercase tracking-wide text-sm ${isActive ? "text-primary" : "text-white/70"}`}>
            <Users className="w-5 h-5" />{t("coach.clients")}
          </NavLink>
          <button onClick={logout} className="flex items-center gap-2 p-4 font-heading uppercase tracking-wide text-sm text-white/70">
            <LogOut className="w-5 h-5" />{t("auth.logout")}
          </button>
        </nav>
      </aside>
      <main className="bg-white"><Outlet /></main>
    </div>
  );
}
