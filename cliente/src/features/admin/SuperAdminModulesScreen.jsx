import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";

const MODULE_LABEL_KEYS = { nutrition: "module.nutrition", exercise: "module.exercise", sleep: "module.sleep", bodyComp: "module.bodyComp" };
const ENVIRONMENTS = ["local", "preview", "production"];
const ENV_LABEL_KEYS = { local: "admin.envLocal", preview: "admin.envPreview", production: "admin.envProduction" };

// The only screen in the superuser panel today: flip each module on/off, per
// environment — local dev, the preview deploy, and production all share one
// backend/database, so the environment tabs are what keep them independent
// (see servidor's APP_ENVIRONMENTS + ModuleGate in cliente's app/router.jsx).
export function SuperAdminModulesScreen() {
  const { t } = useTranslation();
  const [environment, setEnvironment] = useState("production");
  const [flags, setFlags] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  function load(env) { setFlags(null); api.get("/module-flags", { env }).then(setFlags).catch(() => setFlags([])); }
  useEffect(() => { load(environment); }, [environment]);

  async function toggle(key, enabled) {
    setSavingKey(key);
    try { await api.patch(`/admin/module-flags/${key}`, { enabled, environment }); load(environment); }
    finally { setSavingKey(null); }
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{t("admin.modules")}</h1>

      <div className="flex gap-2">
        {ENVIRONMENTS.map((env) => (
          <button
            key={env}
            type="button"
            onClick={() => setEnvironment(env)}
            aria-pressed={environment === env}
            className={`flex-1 px-3 min-h-[44px] border-2 font-heading uppercase tracking-wide text-sm ${environment === env ? "bg-ink text-white border-ink" : "bg-white text-ink border-border"}`}
          >
            {t(ENV_LABEL_KEYS[env])}
          </button>
        ))}
      </div>

      {flags === null ? <p className="text-sm text-ink/50">{t("common.loading")}</p> : (
        <div className="space-y-2">
          {flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between gap-3 border-2 border-border p-4">
              <span className="font-heading uppercase tracking-wide font-bold">{t(MODULE_LABEL_KEYS[flag.key] ?? flag.key)}</span>
              <button
                type="button"
                onClick={() => toggle(flag.key, !flag.enabled)}
                disabled={savingKey === flag.key}
                aria-pressed={flag.enabled}
                className={`min-w-[110px] px-4 min-h-[40px] font-heading uppercase tracking-wide text-sm border-2 disabled:opacity-50 ${flag.enabled ? "bg-success text-white border-success" : "bg-danger text-white border-danger"}`}
              >
                {flag.enabled ? t("admin.enabled") : t("admin.disabled")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
