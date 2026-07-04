import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Menu, X, Apple, Dumbbell, Moon, Scale, Settings, LogOut } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";

const modules = [
  { to: "/nutrition", icon: Apple, key: "module.nutrition" },
  { to: "/exercise", icon: Dumbbell, key: "module.exercise" },
  { to: "/sleep", icon: Moon, key: "module.sleep" },
  { to: "/body-comp", icon: Scale, key: "module.bodyComp" },
];

export function AppHeader({ title, showBack = false, backTo = null, action = null }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 bg-ink text-white">
      {/* Mobile: full bar with hamburger + branding. */}
      <div className="flex items-center gap-2 p-4 lg:hidden">
        {showBack ? (
          <button onClick={() => (backTo ? navigate(backTo) : navigate(-1))} aria-label={t("common.back")} className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <button onClick={() => setOpen(true)} aria-label={t("nav.menu")} aria-expanded={open} className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2">
            <Menu className="w-6 h-6" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold tracking-wide text-lg">BLAZE LIFESTYLE</div>
          <div className="text-white/60 text-xs tracking-wide">{title ?? "NUTRITION TRACKER"}</div>
        </div>
        {action}
      </div>

      {/* Desktop: compact pane header — module navigation lives in the sidebar. */}
      <div className="hidden lg:flex items-center gap-3 px-4 h-14 border-b-2 border-white/10">
        {showBack && (
          <button onClick={() => (backTo ? navigate(backTo) : navigate(-1))} aria-label={t("common.back")} className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <div className="flex-1 min-w-0 font-heading font-bold tracking-wide uppercase text-lg truncate">{title ?? "NUTRITION TRACKER"}</div>
        {action}
      </div>

      {open && (
        <div className="fixed inset-0 z-50">
          <button aria-label={t("common.cancel")} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <nav className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-ink text-white flex flex-col border-r-2 border-white/10">
            <div className="flex items-center justify-between p-4 border-b-2 border-white/10">
              <span className="font-heading font-bold tracking-wide text-lg">BLAZE LIFESTYLE</span>
              <button onClick={() => setOpen(false)} aria-label={t("common.cancel")} className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 py-2">
              {modules.map(({ to, icon: Icon, key }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-4 min-h-[52px] font-heading uppercase tracking-wide text-sm ${isActive ? "text-primary" : "text-white/80"}`}
                >
                  <Icon className="w-5 h-5" />{t(key)}
                </NavLink>
              ))}
            </div>
            <div className="border-t-2 border-white/10">
              <NavLink
                to="/settings"
                onClick={() => setOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-4 min-h-[52px] font-heading uppercase tracking-wide text-sm ${isActive ? "text-primary" : "text-white/80"}`}
              >
                <Settings className="w-5 h-5" />{t("settings.title")}
              </NavLink>
              <button
                onClick={() => { setOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-4 min-h-[52px] font-heading uppercase tracking-wide text-sm text-white/80"
              >
                <LogOut className="w-5 h-5" />{t("auth.logout")}
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
