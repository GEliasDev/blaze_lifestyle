import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Apple, Dumbbell, Moon, Scale } from "lucide-react";
import { api } from "../../lib/api.js";

const ROW = "flex items-center gap-3 px-4 min-h-[56px] font-heading uppercase tracking-wide text-sm border-b-2 border-white/10";

// Coach view of a single client: a full-width module sidebar. Modules are
// visual only for now (they don't navigate anywhere yet).
export function ClientModulesScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);

  useEffect(() => {
    api.get("/coach/clients").then((cs) => setClient(cs.find((c) => c.id === id) ?? null)).catch(() => setClient(null));
  }, [id]);

  return (
    <div className="min-h-dvh flex flex-col bg-ink text-white">
      <div className="flex items-center gap-2 p-4 border-b-2 border-white/10">
        <button onClick={() => navigate("/coach")} aria-label={t("common.back")} className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="min-w-0">
          <div className="font-heading uppercase tracking-wide text-xs text-white/50">{t("coach.client")}</div>
          <div className="font-heading font-bold tracking-wide text-lg truncate">{client ? client.name : "…"}</div>
        </div>
      </div>

      <nav className="flex-1">
        <Link to={`/coach/clients/${id}/nutrition`} className={`${ROW} text-white hover:text-primary`}>
          <Apple className="w-5 h-5" /><span className="flex-1">{t("module.nutrition")}</span>
          <ChevronRight className="w-5 h-5 text-white/40" />
        </Link>
        <div className={`${ROW} text-white/40`}><Dumbbell className="w-5 h-5" />{t("module.exercise")}</div>
        <div className={`${ROW} text-white/40`}><Moon className="w-5 h-5" />{t("module.sleep")}</div>
        <div className={`${ROW} text-white/40`}><Scale className="w-5 h-5" />{t("module.bodyComp")}</div>
      </nav>
    </div>
  );
}
