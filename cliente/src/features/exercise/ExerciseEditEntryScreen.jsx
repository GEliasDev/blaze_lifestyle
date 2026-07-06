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

const MAX_PHOTOS = 5;

function timeOf(iso) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }); }
function dateOf(iso) { return new Date(iso).toLocaleDateString("en-CA"); }

export function ExerciseEditEntryScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiBase, linkBase } = useExerciseScope();
  const [entry, setEntry] = useState(null);
  const [tags, setTags] = useState(null);
  const [form, setForm] = useState(null);
  const [kept, setKept] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    api.get("/exercise-tags").then(setTags).catch(() => setTags([]));
    api.get(`${apiBase}/${id}`).then((e) => {
      setEntry(e);
      setKept(e.photos);
      setSelectedTagIds(e.tags.map((tg) => tg.id));
      setForm({ date: dateOf(e.exercisedAt), time: timeOf(e.exercisedAt), description: e.description, biofeedback: e.biofeedback ?? "" });
    }).catch(() => setEntry(false));
  }, [apiBase, id]);

  if (entry === null || !form || tags === null) return (<><AppHeader title={t("exercise.editEntry").toUpperCase()} showBack /><Spinner /></>);
  if (entry === false) return (<><AppHeader title={t("exercise.editEntry").toUpperCase()} showBack /><p className="p-8 text-center text-ink/50">{t("exercise.noEntries")}</p></>);

  function set(patch) { setForm((f) => ({ ...f, ...patch })); }
  function toggleTag(tagId) { setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((x) => x !== tagId) : [...prev, tagId])); }

  const newPreviews = newFiles.map((f) => ({ f, url: URL.createObjectURL(f) }));
  const total = kept.length + newFiles.length;
  const canSave = selectedTagIds.length > 0 && form.description.trim() && !saving && !compressing;

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
    const fd = new FormData();
    selectedTagIds.forEach((tid) => fd.append("tagIds", tid));
    fd.append("exercisedAt", new Date(`${form.date}T${form.time}:00`).toISOString());
    fd.append("description", form.description.trim());
    fd.append("biofeedback", form.biofeedback.trim());
    kept.forEach((p) => fd.append("keep", p.storageKey));
    newFiles.forEach((f) => fd.append("photos", f));
    try { await api.patchForm(`${apiBase}/${id}`, fd); navigate(`${linkBase}/${id}`); }
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
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.tags")} <span className="text-danger">*</span></h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-2 text-sm font-heading uppercase tracking-wide border-2 ${selectedTagIds.includes(tag.id) ? `bg-${tag.color} text-white border-transparent` : "bg-white text-ink border-ink"}`}
              >
                {tag.name}
              </button>
            ))}
          </div>
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
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.description")}</h3>
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3} className="w-full p-3 border-2 border-border rounded-none resize-none" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.biofeedback")}</h3>
          <textarea value={form.biofeedback} onChange={(e) => set({ biofeedback: e.target.value })} rows={3} className="w-full p-3 border-2 border-border rounded-none resize-none" />
        </section>
      </div>

      <div className="sticky bottom-0 z-30 bg-white p-4 border-t-2 border-border flex gap-3">
        <Button variant="primary" className="flex-1" disabled={!canSave} onClick={onSave}>{t("exercise.saveChanges")}</Button>
        <Button variant="secondary" className="flex-1" onClick={() => navigate(`${linkBase}/${id}`)}>{t("common.cancel")}</Button>
      </div>
    </>
  );
}
