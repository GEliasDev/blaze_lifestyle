import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, Clock, Trash2 } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";
import { PhotoCarousel } from "../../components/PhotoCarousel.jsx";
import { useNutritionScope } from "./useNutritionScope.js";
import { useNutritionListRefresh } from "./NutritionLayout.jsx";

const BADGE = {
  yes: { cls: "bg-success text-white", key: "meal.complianceYes" },
  no: { cls: "bg-danger text-white", key: "meal.complianceNo" },
  na: { cls: "bg-ink/50 text-white", key: "meal.complianceNa" },
};

export function EntryDetailScreen() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { apiBase, linkBase } = useNutritionScope();
  const refreshList = useNutritionListRefresh();
  const [entry, setEntry] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { api.get(`${apiBase}/${id}`).then(setEntry).catch(() => setEntry(false)); }, [apiBase, id]);

  async function onDelete() {
    setDeleting(true);
    try { await api.del(`${apiBase}/${id}`); refreshList(); navigate(linkBase); }
    finally { setDeleting(false); }
  }

  const editAction = (
    <button
      onClick={() => navigate(`${linkBase}/${id}/edit`)}
      className="bg-primary text-white font-heading uppercase tracking-wide text-sm px-4 min-h-[40px] rounded-full transition-transform active:scale-95 motion-reduce:active:scale-100"
    >
      {t("meal.edit")}
    </button>
  );

  if (entry === null) return (<><AppHeader title={t("entry.detail").toUpperCase()} showBack backTo={linkBase} /><Spinner /></>);
  if (entry === false) return (<><AppHeader title={t("entry.detail").toUpperCase()} showBack backTo={linkBase} /><p className="p-8 text-center text-ink/50">{t("entry.noEntries")}</p></>);

  const date = new Date(entry.eatenAt).toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = new Date(entry.eatenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const badge = BADGE[entry.compliance] ?? BADGE.na;

  return (
    <>
      <AppHeader title={t("entry.detail").toUpperCase()} showBack backTo={linkBase} action={editAction} />
      <div className="flex-1 overflow-y-auto">
        <PhotoCarousel photos={entry.photos} />

        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading uppercase tracking-wide text-xl font-bold">{t(`category.${entry.category}`)}</h2>
              <p className="text-ink/60 capitalize">{date}</p>
              <p className="flex items-center gap-1 text-ink/60 text-sm mt-1"><Clock className="w-3.5 h-3.5" />{time}</p>
            </div>
            <span className={`shrink-0 font-heading uppercase tracking-wide text-xs px-3 py-2 ${badge.cls}`}>{t(badge.key)}</span>
          </div>

          {entry.description && (
            <section className="border-2 border-border p-3">
              <h3 className="font-heading uppercase tracking-wide text-sm mb-1">{t("entry.description")}</h3>
              <p className="text-ink/80">{entry.description}</p>
            </section>
          )}

          <section className="border-2 border-border p-3">
            <h3 className="font-heading uppercase tracking-wide text-sm mb-2">{t("meal.digestive")}</h3>
            <div className={`flex items-center gap-2 font-heading uppercase tracking-wide text-sm ${entry.hasSymptoms ? "text-danger" : "text-ink/70"}`}>
              {entry.hasSymptoms ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
              <span>{entry.hasSymptoms ? t("meal.symptomsReported") : t("meal.noSymptoms")}</span>
            </div>
            {entry.hasSymptoms && entry.symptomDescription && (
              <p className="mt-2 text-sm text-danger/90 border-2 border-danger/30 bg-danger/5 p-2">{entry.symptomDescription}</p>
            )}
          </section>

          <button
            onClick={() => setConfirming(true)}
            className="w-full min-h-[44px] px-4 font-heading uppercase tracking-wide border-2 border-danger text-danger rounded-none flex items-center justify-center gap-2 transition-transform active:scale-95 motion-reduce:active:scale-100"
          >
            <Trash2 className="w-5 h-5" />{t("entry.delete")}
          </button>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label={t("common.cancel")} onClick={() => setConfirming(false)} className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white border-2 border-ink w-full max-w-sm p-4 space-y-4">
            <p className="font-medium">{t("entry.deleteConfirm")}</p>
            <div className="flex gap-3">
              <Button variant="primary" className="flex-1 bg-danger border-danger" disabled={deleting} onClick={onDelete}>{t("entry.delete")}</Button>
              <Button variant="secondary" className="flex-1" disabled={deleting} onClick={() => setConfirming(false)}>{t("common.cancel")}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
