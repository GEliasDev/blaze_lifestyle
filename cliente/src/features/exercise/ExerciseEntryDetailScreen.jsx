import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, Trash2 } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";
import { PhotoCarousel } from "../../components/PhotoCarousel.jsx";
import { useExerciseScope } from "./useExerciseScope.js";
import { FEELINGS } from "./feelings.js";

export function ExerciseEntryDetailScreen() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { apiBase, linkBase } = useExerciseScope();
  const [entry, setEntry] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The only way into this screen is via Calendar (Journal was dropped) — back
  // always returns there, for both the client and the coach's read-only view.
  const backTo = `${linkBase}/calendar`;

  useEffect(() => { api.get(`${apiBase}/${id}`).then(setEntry).catch(() => setEntry(false)); }, [apiBase, id]);

  async function onDelete() {
    setDeleting(true);
    try { await api.del(`${apiBase}/${id}`); navigate(backTo); }
    finally { setDeleting(false); }
  }

  const editAction = (
    <button onClick={() => navigate(`${linkBase}/${id}/edit`)} className="bg-primary text-white font-heading uppercase tracking-wide text-sm px-4 min-h-[40px] rounded-full">
      {t("exercise.edit")}
    </button>
  );

  if (entry === null) return (<><AppHeader title={t("exercise.detail").toUpperCase()} showBack backTo={backTo} /><Spinner /></>);
  if (entry === false) return (<><AppHeader title={t("exercise.detail").toUpperCase()} showBack backTo={backTo} /><p className="p-8 text-center text-ink/50">{t("exercise.noEntries")}</p></>);

  const date = new Date(entry.exercisedAt).toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = new Date(entry.exercisedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const feeling = FEELINGS.find((f) => f.value === entry.feeling);

  return (
    <>
      <AppHeader title={t("exercise.detail").toUpperCase()} showBack backTo={backTo} action={editAction} />
      <div className="flex-1 overflow-y-auto">
        <PhotoCarousel photos={entry.photos} />
        <div className="p-4 space-y-4">
          <h2 className="font-heading text-xl font-bold">{entry.title}</h2>
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <span key={tag.id} className={`px-2 py-1 text-xs text-white bg-${tag.color}`}>{tag.name}</span>
            ))}
          </div>
          <div>
            <p className="text-ink/60 capitalize">{date}</p>
            <p className="text-ink/60 text-sm">{time}</p>
          </div>
          <section className="border-2 border-border p-3">
            <h3 className="font-heading uppercase tracking-wide text-sm mb-1">{t("exercise.description")}</h3>
            <p className="text-ink/80">{entry.description}</p>
          </section>
          <section className="border-2 border-border p-3">
            <h3 className="font-heading uppercase tracking-wide text-sm mb-2">{t("exercise.alertLabel")}</h3>
            <div className={`flex items-center gap-2 font-heading uppercase tracking-wide text-sm ${entry.hasAlert ? "text-danger" : "text-ink/70"}`}>
              {entry.hasAlert ? <AlertTriangle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
              <span>{entry.hasAlert ? t("exercise.alertYes") : t("exercise.alertNo")}</span>
            </div>
          </section>
          {(entry.biofeedback || feeling) && (
            <section className="border-2 border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.biofeedback")}</h3>
                {feeling && (
                  <span className="flex items-center gap-1 text-ink/70 text-sm">
                    <feeling.icon className="w-5 h-5" />{t(feeling.labelKey)}
                  </span>
                )}
              </div>
              {entry.biofeedback && <p className="text-ink/80">{entry.biofeedback}</p>}
            </section>
          )}
          <button onClick={() => setConfirming(true)} className="w-full min-h-[44px] px-4 font-heading uppercase tracking-wide border-2 border-danger text-danger flex items-center justify-center gap-2">
            <Trash2 className="w-5 h-5" />{t("exercise.delete")}
          </button>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label={t("common.cancel")} onClick={() => setConfirming(false)} className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white border-2 border-ink w-full max-w-sm p-4 space-y-4">
            <p className="font-medium">{t("exercise.deleteConfirm")}</p>
            <div className="flex gap-3">
              <Button variant="primary" className="flex-1 bg-danger border-danger" disabled={deleting} onClick={onDelete}>{t("exercise.delete")}</Button>
              <Button variant="secondary" className="flex-1" disabled={deleting} onClick={() => setConfirming(false)}>{t("common.cancel")}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
