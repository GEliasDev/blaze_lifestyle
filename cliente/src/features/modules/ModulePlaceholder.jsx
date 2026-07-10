import { useTranslation } from "react-i18next";
import { AppHeader } from "../../components/AppHeader.jsx";

export function ModulePlaceholder({ titleKey, messageKey = "module.empty" }) {
  const { t } = useTranslation();
  return (
    <>
      <AppHeader title={t(titleKey).toUpperCase()} />
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="font-heading uppercase tracking-wide text-ink/40 text-sm">{t(messageKey)}</p>
      </div>
    </>
  );
}
