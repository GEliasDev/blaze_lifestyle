import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { useAuth } from "../../lib/auth.jsx";

export function SuperAdminLayout() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  return (
    <div className="h-dvh flex flex-col bg-white">
      <header className="shrink-0 bg-ink text-white p-4 flex items-center justify-between">
        <div>
          <div className="font-heading font-bold tracking-wide text-lg">BLAZE LIFESTYLE</div>
          <div className="text-white/60 text-xs tracking-wide">SUPER ADMIN</div>
        </div>
        <button onClick={logout} className="flex items-center gap-2 font-heading uppercase tracking-wide text-sm text-white/70">
          <LogOut className="w-5 h-5" />{t("auth.logout")}
        </button>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
