import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, X } from "lucide-react";
import { api } from "../../lib/api.js";
import { compressImages } from "../../lib/imageCompress.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { useExerciseScope } from "./useExerciseScope.js";
import { ExerciseTagPicker } from "./ExerciseTagPicker.jsx";
import { FEELINGS } from "./feelings.js";

const MAX_PHOTOS = 5;

function timeOf(iso) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }); }
function dateOf(iso) { return new Date(iso).toLocaleDateString("en-CA"); }

export function ExerciseEditEntryScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiBase, usedTagsBase, linkBase } = useExerciseScope();
  const [entry, setEntry] = useState(null);
  const [form, setForm] = useState(null);
  const [kept, setKept] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [feeling, setFeeling] = useState("");
  const [hasAlert, setHasAlert] = useState(false);
  const [alertNote, setAlertNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`${apiBase}/${id}`).then((e) => {
      setEntry(e);
      setKept(e.photos);
      // Older entries could have more than one tag from before this screen
      // was restricted to a single selection — keep just the first on load;
      // saving will collapse it down to that one.
      setSelectedTagId(e.tags[0]?.id ?? null);
      setFeeling(e.feeling ?? "");
      setHasAlert(e.hasAlert);
      setAlertNote(e.alertNote ?? "");
      setForm({ date: dateOf(e.exercisedAt), time: timeOf(e.exercisedAt), title: e.title, description: e.description, biofeedback: e.biofeedback ?? "" });
    }).catch(() => setEntry(false));
  }, [apiBase, id]);

  if (entry === null || !form) return (<><AppHeader title={t("exercise.editEntry").toUpperCase()} showBack /><Spinner /></>);
  if (entry === false) return (<><AppHeader title={t("exercise.editEntry").toUpperCase()} showBack /><p className="p-8 text-center text-ink/50">{t("exercise.noEntries")}</p></>);

  function set(patch) { setForm((f) => ({ ...f, ...patch })); }
  function toggleTag(tagId) { setSelectedTagId((prev) => (prev === tagId ? null : tagId)); }

  const newPreviews = newFiles.map((f) => ({ f, url: URL.createObjectURL(f) }));
  const total = kept.length + newFiles.length;
  const canSave = selectedTagId && form.title.trim() && form.description.trim() && !saving && !compressing;

  async function onFilesPicked(fileList) {
    setCompressing(true);
    try {
      const compressed = await compressImages(Array.from(fileList));
      setNewFiles((prev) => [...prev, ...compressed].slice(0, MAX_PHOTOS - kept.length));
    } finally {
      setCompressing(false);
    }
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.append("tagIds", selectedTagId);
    fd.append("exercisedAt", new Date(`${form.date}T${form.time}:00`).toISOString());
    fd.append("title", form.title.trim());
    fd.append("description", form.description.trim());
    fd.append("biofeedback", form.biofeedback.trim());
    fd.append("feeling", feeling);
    fd.append("hasAlert", String(hasAlert));
    fd.append("alertNote", hasAlert ? alertNote.trim() : "");
    kept.forEach((p) => fd.append("keep", p.storageKey));
    newFiles.forEach((f) => fd.append("photos", f));
    try { await api.patchForm(`${apiBase}/${id}`, fd); navigate(`${linkBase}/${id}`); }
    catch (err) { setError(err.message || t("common.error")); }
    finally { setSaving(false); }
  }

  return (
    <>
      <AppHeader title={t("exercise.editEntry").toUpperCase()} showBack />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.photos")} <span className="text-ink/40">{t("exercise.maxPhotos")}</span></h3>
          {total > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {kept.map((p) => (
                <div key={p.storageKey} className="relative">
                  <AuthImage path={`/photos/${p.thumbKey}`} className="w-full h-24 object-cover border-2 border-border" />
                  <button onClick={() => setKept(kept.filter((x) => x.storageKey !== p.storageKey))} aria-label="remove" className="absolute top-1 right-1 bg-danger text-white p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {newPreviews.map((p, i) => (
                <div key={`new-${i}`} className="relative">
                  <img src={p.url} alt="" className="w-full h-24 object-cover border-2 border-border" />
                  <button onClick={() => setNewFiles(newFiles.filter((_, j) => j !== i))} aria-label="remove" className="absolute top-1 right-1 bg-danger text-white p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {total < MAX_PHOTOS && (
            <label className={`flex flex-col items-center justify-center h-28 border-2 border-dashed border-ink/40 text-ink/60 ${compressing ? "opacity-50" : "cursor-pointer"}`}>
              <Camera className="w-7 h-7 mb-1" />
              <span className="font-heading uppercase text-sm">{compressing ? t("exercise.processingPhotos") : t("exercise.addPhotos")}</span>
              <input type="file" accept="image/*" multiple className="hidden" disabled={compressing} onChange={(e) => onFilesPicked(e.target.files)} />
            </label>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.tag")} <span className="text-danger">*</span></h3>
          <ExerciseTagPicker usedTagsBase={usedTagsBase} selectedTagId={selectedTagId} onSelect={toggleTag} />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.date")}</h3>
          <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.time")}</h3>
          <input type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.title")} <span className="text-danger">*</span></h3>
          <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder={t("exercise.titleHint")}
            className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.description")}</h3>
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3} className="w-full p-3 border-2 border-border rounded-none resize-none" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.biofeedback")}</h3>
          <textarea value={form.biofeedback} onChange={(e) => set({ biofeedback: e.target.value })} rows={3}
            placeholder={t("exercise.biofeedbackHint")}
            className="w-full p-3 border-2 border-border rounded-none resize-none" />
          <div className="flex justify-center gap-4 pt-1">
            {FEELINGS.map(({ value, icon: Icon, labelKey }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFeeling((prev) => (prev === value ? "" : value))}
                aria-label={t(labelKey)}
                aria-pressed={feeling === value}
                className={`w-14 h-14 flex items-center justify-center border-2 ${feeling === value ? "bg-primary text-white border-primary" : "bg-white text-ink border-ink"}`}
              >
                <Icon className="w-7 h-7" />
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.alertQuestion")}</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setHasAlert(true)}
              aria-pressed={hasAlert}
              className={`flex-1 px-3 min-h-[44px] border-2 font-heading uppercase tracking-wide ${hasAlert ? "bg-danger text-white border-danger" : "bg-white text-ink border-ink"}`}
            >
              {t("exercise.alertYes")}
            </button>
            <button
              type="button"
              onClick={() => setHasAlert(false)}
              aria-pressed={!hasAlert}
              className={`flex-1 px-3 min-h-[44px] border-2 font-heading uppercase tracking-wide ${!hasAlert ? "bg-primary text-white border-primary" : "bg-white text-ink border-ink"}`}
            >
              {t("exercise.alertNo")}
            </button>
          </div>
          {hasAlert && (
            <textarea value={alertNote} onChange={(e) => setAlertNote(e.target.value)} rows={3}
              placeholder={t("exercise.alertNoteHint")}
              className="w-full p-3 border-2 border-danger rounded-none resize-none bg-danger/5" />
          )}
        </section>
      </div>

      <div className="sticky bottom-0 z-30 bg-white p-4 border-t-2 border-border space-y-2">
        {error && <p role="alert" className="text-danger text-sm">{error}</p>}
        <div className="flex gap-3">
          <Button variant="primary" className="flex-1" disabled={!canSave} onClick={onSave}>{t("exercise.saveChanges")}</Button>
          <Button variant="secondary" className="flex-1" onClick={() => navigate(`${linkBase}/${id}`)}>{t("common.cancel")}</Button>
        </div>
      </div>
    </>
  );
}
