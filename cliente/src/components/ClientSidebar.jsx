import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Apple, Dumbbell, Moon, Scale, Settings, LogOut } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";

const modules = [
  { to: "/nutrition", icon: Apple, key: "module.nutrition" },
  { to: "/exercise", icon: Dumbbell, key: "module.exercise" },
  { to: "/sleep", icon: Moon, key: "module.sleep" },
  { to: "/body-comp", icon: Scale, key: "module.bodyComp" },
];

const ROW = "flex items-center gap-3 px-4 min-h-[52px] font-heading uppercase tracking-wide text-sm";

// Persistent module navigation for the client on desktop (≥1024px). On mobile
// this is hidden and navigation lives in the AppHeader hamburger drawer.
export function ClientSidebar() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  return (
    <aside className="hidden lg:flex lg:flex-col lg:h-dvh lg:sticky lg:top-0 bg-ink text-white border-r-2 border-white/10">
      <div className="p-4 border-b-2 border-white/10">
        <img src="/logo-full.webp" alt="Blaze Lifestyle" className="h-12 w-auto" />
        <div className="text-white/60 text-xs tracking-wide mt-1">NUTRITION TRACKER</div>
      </div>
      <nav className="flex-1 py-2">
        {modules.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `${ROW} ${isActive ? "text-primary" : "text-white/80"}`}
          >
            <Icon className="w-5 h-5" />{t(key)}
          </NavLink>
        ))}
      </nav>
      <div className="border-t-2 border-white/10">
        <NavLink
          to="/settings"
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
