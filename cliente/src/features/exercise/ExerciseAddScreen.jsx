import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, X } from "lucide-react";
import { api } from "../../lib/api.js";
import { compressImages } from "../../lib/imageCompress.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Button } from "../../components/Button.jsx";
import { useExerciseScope } from "./useExerciseScope.js";

const MAX_PHOTOS = 5;

function today() { return new Date().toLocaleDateString("en-CA"); }
function now() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }); }

export function ExerciseAddScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiBase, linkBase } = useExerciseScope();
  const [tags, setTags] = useState(null);
  const [files, setFiles] = useState([]);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(now());
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [description, setDescription] = useState("");
  const [biofeedback, setBiofeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => { api.get("/exercise-tags").then(setTags).catch(() => setTags([])); }, []);

  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));
  const canSave = selectedTagIds.length > 0 && description.trim() && !saving && !compressing;

  function toggleTag(id) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onFilesPicked(fileList) {
    setCompressing(true);
    try {
      const compressed = await compressImages(Array.from(fileList));
      setFiles((prev) => [...prev, ...compressed].slice(0, MAX_PHOTOS));
    } finally {
      setCompressing(false);
    }
  }

  async function onSave() {
    setSaving(true);
    const form = new FormData();
    selectedTagIds.forEach((id) => form.append("tagIds", id));
    form.append("exercisedAt", new Date(`${date}T${time}:00`).toISOString());
    form.append("description", description.trim());
    if (biofeedback.trim()) form.append("biofeedback", biofeedback.trim());
    files.forEach((f) => form.append("photos", f));
    try { await api.postForm(apiBase, form); navigate(linkBase); }
    finally { setSaving(false); }
  }

  return (
    <>
      <AppHeader title={t("exercise.addEntry").toUpperCase()} showBack backTo={linkBase} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.photos")} <span className="text-ink/40">{t("exercise.maxPhotos")}</span></h3>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p.url} alt="" className="w-full h-24 object-cover border-2 border-border" />
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="remove" className="absolute top-1 right-1 bg-danger text-white p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {files.length < MAX_PHOTOS && (
            <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed border-ink/40 text-ink/60 ${compressing ? "opacity-50" : "cursor-pointer"}`}>
              <Camera className="w-7 h-7 mb-1" />
              <span className="font-heading uppercase text-sm">{compressing ? t("exercise.processingPhotos") : t("exercise.addPhotos")}</span>
              <input type="file" accept="image/*" multiple className="hidden" disabled={compressing} onChange={(e) => onFilesPicked(e.target.files)} />
            </label>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.tags")} <span className="text-danger">*</span></h3>
          {tags === null ? <p className="text-sm text-ink/50">{t("common.loading")}</p> : (
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
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.date")}</h3>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.time")}</h3>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.description")} <span className="text-danger">*</span></h3>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder={t("exercise.descriptionHint")}
            className="w-full p-3 border-2 border-border rounded-none resize-none" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.biofeedback")}</h3>
          <textarea value={biofeedback} onChange={(e) => setBiofeedback(e.target.value)} rows={3}
            placeholder={t("exercise.biofeedbackHint")}
            className="w-full p-3 border-2 border-border rounded-none resize-none" />
        </section>
      </div>

      <div className="sticky bottom-0 z-30 bg-white p-4 border-t-2 border-border">
        <Button variant="primary" className="w-full" disabled={!canSave} onClick={onSave}>{t("exercise.save")}</Button>
      </div>
    </>
  );
}
