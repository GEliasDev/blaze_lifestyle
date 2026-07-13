import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useSWUpdate } from "../lib/swUpdate.js";

// Fixed full-width bar, same spot/style on mobile and desktop — sits above
// any module bottom nav so it never gets hidden behind one.
export function UpdateBanner() {
  const { t } = useTranslation();
  const { needsRefresh, applyUpdate, dismiss } = useSWUpdate();

  if (!needsRefresh) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t-2 border-ink p-3 flex items-center justify-between gap-3">
      <p className="font-heading uppercase tracking-wide text-sm">{t("update.available")}</p>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={applyUpdate}
          className="bg-primary text-white font-heading uppercase tracking-wide text-sm px-4 min-h-[40px] flex items-center"
        >
          {t("update.action")}
        </button>
        <button onClick={dismiss} aria-label={t("common.cancel")} className="min-h-[40px] min-w-[40px] flex items-center justify-center text-ink/50">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
