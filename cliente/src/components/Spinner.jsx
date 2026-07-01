import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

export function Spinner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 p-4">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      <span className="font-heading uppercase tracking-wide text-sm text-ink/60">{t("common.loading")}</span>
    </div>
  );
}
