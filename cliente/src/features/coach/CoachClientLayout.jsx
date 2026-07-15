import { useEffect, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Apple, Dumbbell, Moon, Scale } from "lucide-react";
import { api } from "../../lib/api.js";

const ROW = "flex items-center gap-3 px-4 min-h-[52px] font-heading uppercase tracking-wide text-sm";

// Per-client shell for the coach. Mirrors the client's ClientShell: on desktop
// (lg+) a persistent module sidebar sits to the left of the content, so the
// coach sees [modules · list · detail] in one view instead of a separate
// module-list screen first. On mobile the sidebar is hidden and the content
// (nutrition) takes the full screen.
export function CoachClientLayout() {
  const { clientId } = useParams();
  const { t } = useTranslation();
  const [client, setClient] = useState(null);

  useEffect(() => {
    api.get("/coach/clients").then((cs) => setClient(cs.find((c) => c.id === clientId) ?? null)).catch(() => setClient(null));
  }, [clientId]);

  return (
    <div className="h-dvh flex flex-col lg:grid lg:grid-cols-[220px_1fr] bg-white">
      <aside className="hidden lg:flex lg:flex-col lg:h-dvh lg:sticky lg:top-0 bg-ink text-white border-r-2 border-white/10">
        <div className="p-4 border-b-2 border-white/10">
          <NavLink to="/coach" className="flex items-center gap-1 mb-2 text-white/60 hover:text-white text-xs font-heading uppercase tracking-wide">
            <ChevronLeft className="w-4 h-4" />{t("coach.clients")}
          </NavLink>
          <div className="font-heading uppercase tracking-wide text-xs text-white/50">{t("coach.client")}</div>
          <div className="font-heading font-bold tracking-wide text-lg truncate">{client ? (client.nickname || client.name) : "…"}</div>
        </div>
        <nav className="flex-1 py-2">
          <NavLink to="nutrition" className={({ isActive }) => `${ROW} ${isActive ? "text-primary" : "text-white/80"}`}>
            <Apple className="w-5 h-5" />{t("module.nutrition")}
          </NavLink>
          <NavLink to="exercise" className={({ isActive }) => `${ROW} ${isActive ? "text-primary" : "text-white/80"}`}>
            <Dumbbell className="w-5 h-5" />{t("module.exercise")}
          </NavLink>
          <div className={`${ROW} text-white/30`}><Moon className="w-5 h-5" />{t("module.sleep")}</div>
          <div className={`${ROW} text-white/30`}><Scale className="w-5 h-5" />{t("module.bodyComp")}</div>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 min-h-0 flex flex-col overflow-hidden"><Outlet context={client} /></div>
    </div>
  );
}
