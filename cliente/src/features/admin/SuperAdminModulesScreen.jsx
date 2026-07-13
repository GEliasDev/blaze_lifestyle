import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";

const MODULE_LABEL_KEYS = { nutrition: "module.nutrition", exercise: "module.exercise", sleep: "module.sleep", bodyComp: "module.bodyComp" };

// The only screen in the superuser panel today: flip each module on/off.
// Disabled modules show client/coach-side as a "working on it" placeholder
// instead of their real screens (see ModuleGate in app/router.jsx).
export function SuperAdminModulesScreen() {
  const { t } = useTranslation();
  const [flags, setFlags] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  function load() { api.get("/module-flags").then(setFlags).catch(() => setFlags([])); }
  useEffect(() => { load(); }, []);

  async function toggle(key, enabled) {
    setSavingKey(key);
    try { await api.patch(`/admin/module-flags/${key}`, { enabled }); load(); }
    finally { setSavingKey(null); }
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{t("admin.modules")}</h1>
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
