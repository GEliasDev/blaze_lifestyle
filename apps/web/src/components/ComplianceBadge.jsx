import { useTranslation } from "react-i18next";
import { Check, X, Minus, Clock } from "lucide-react";

const styles = {
  yes: { cls: "bg-success text-white border-success", Icon: Check },
  no: { cls: "bg-danger text-white border-danger", Icon: X },
  na: { cls: "bg-white text-ink border-ink", Icon: Minus },
  pending: { cls: "bg-muted text-ink/70 border-border", Icon: Clock },
};
export function ComplianceBadge({ value = "na" }) {
  const { t } = useTranslation();
  const s = styles[value] ?? styles.na;
  const Icon = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1 border-2 px-2 py-1 text-xs font-heading uppercase tracking-wide ${s.cls}`}>
      <Icon className="w-3 h-3" />{t(`compliance.${value}`)}
    </span>
  );
}
