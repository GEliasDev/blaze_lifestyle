import { Link, useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Apple, Dumbbell, Moon, Scale, ChevronRight } from "lucide-react";
import { AppHeader } from "../../components/AppHeader.jsx";

const MODULES = [
  { to: "nutrition", icon: Apple, key: "module.nutrition", enabled: true },
  { to: "exercise", icon: Dumbbell, key: "module.exercise", enabled: true },
  { to: null, icon: Moon, key: "module.sleep", enabled: false },
  { to: null, icon: Scale, key: "module.bodyComp", enabled: false },
];

// Index route for a coach reviewing one client. On mobile this is the only
// way to pick a module (CoachClientLayout's sidebar is desktop-only); on
// desktop the sidebar already lists the modules, so this list stays hidden.
export function CoachClientHome() {
  const client = useOutletContext();
  const { t } = useTranslation();

  return (
    <>
      <AppHeader title={client ? client.name.toUpperCase() : t("coach.client").toUpperCase()} showBack backTo="/coach" />
      <div className="flex-1 p-3 space-y-3 lg:hidden">
        {MODULES.map(({ to, icon: Icon, key, enabled }) =>
          enabled ? (
            <Link
              key={key}
              to={to}
              className="flex items-center gap-3 bg-white border-2 border-border p-4 hover:border-primary"
            >
              <Icon className="w-5 h-5 text-ink" />
              <span className="flex-1 font-heading uppercase tracking-wide font-bold">{t(key)}</span>
              <ChevronRight className="w-5 h-5 text-ink/40" />
            </Link>
          ) : (
            <div key={key} className="flex items-center gap-3 bg-muted border-2 border-border p-4 text-ink/40">
              <Icon className="w-5 h-5" />
              <span className="flex-1 font-heading uppercase tracking-wide font-bold">{t(key)}</span>
              <span className="text-xs">{t("module.empty")}</span>
            </div>
          )
        )}
      </div>
    </>
  );
}
