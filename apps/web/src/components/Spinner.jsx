import { useTranslation } from "react-i18next";
export function Spinner() {
  const { t } = useTranslation();
  return <p className="p-4 font-heading uppercase tracking-wide text-sm text-ink/60">{t("common.loading")}</p>;
}
