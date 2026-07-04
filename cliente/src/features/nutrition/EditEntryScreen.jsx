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
import { useNutritionScope } from "./useNutritionScope.js";
import { useNutritionListRefresh } from "./NutritionLayout.jsx";

const CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];
const COMPLIANCE = ["na", "yes", "no"];
const MAX_PHOTOS = 5;

function timeOf(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dateOf(iso) {
  return new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

export function EditEntryScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiBase, linkBase } = useNutritionScope();
  const refreshList = useNutritionListRefresh();
  const [entry, setEntry] = useState(null);
  const [form, setForm] = useState(null);
  const [kept, setKept] = useState([]);     // existing photos to keep
  const [newFiles, setNewFiles] = useState([]); // newly added File objects
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    api.get(`${apiBase}/${id}`).then((e) => {
      setEntry(e);
      setKept(e.photos);
      setForm({
        date: dateOf(e.eatenAt),
        time: timeOf(e.eatenAt),
        category: e.category,
        compliance: e.compliance,
        description: e.description ?? "",
        hasSymptoms: e.hasSymptoms,
        symptomDescription: e.symptomDescription ?? "",
      });
    }).catch(() => setEntry(false));
  }, [apiBase, id]);

  if (entry === null || !form) return (<><AppHeader title={t("meal.editTitle").toUpperCase()} showBack /><Spinner /></>);
  if (entry === false) return (<><AppHeader title={t("meal.editTitle").toUpperCase()} showBack /><p className="p-8 text-center text-ink/50">{t("entry.noEntries")}</p></>);

  function set(patch) { setForm((f) => ({ ...f, ...patch })); }

  const newPreviews = newFiles.map((f) => ({ f, url: URL.createObjectURL(f) }));
  const total = kept.length + newFiles.length;
  const canSave = form.category && form.date && form.time && form.description.trim() && !saving && !compressing;

  function eatenAtISO() {
    return new Date(`${form.date}T${form.time}:00`).toISOString();
  }

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
    fd.append("category", form.category);
    fd.append("eatenAt", eatenAtISO());
    fd.append("compliance", form.compliance);
    fd.append("description", form.description);
    fd.append("hasSymptoms", String(form.hasSymptoms));
    fd.append("symptomDescription", form.hasSymptoms ? form.symptomDescription : "");
    kept.forEach((p) => fd.append("keep", p.storageKey));
    newFiles.forEach((f) => fd.append("photos", f));
    try { await api.patchForm(`${apiBase}/${id}`, fd); refreshList(); navigate(`${linkBase}/${id}`); }
    finally { setSaving(false); }
  }

  return (
    <>
      <AppHeader title={t("meal.editTitle").toUpperCase()} showBack />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("meal.photos")} <span className="text-ink/40">{t("meal.maxPhotos")}</span></h3>
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
              <span className="font-heading uppercase text-sm">{compressing ? t("meal.processingPhotos") : t("meal.addPhotos")}</span>
              <input type="file" accept="image/*" multiple className="hidden" disabled={compressing}
                onChange={(e) => onFilesPicked(e.target.files)} />
            </label>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("meal.date")}</h3>
          <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })}
            className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("meal.time")}</h3>
          <input type="time" value={form.time} onChange={(e) => set({ time: e.target.value })}
            className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("meal.type")}</h3>
          <select value={form.category} onChange={(e) => set({ category: e.target.value })}
            className="w-full p-3 border-2 border-border rounded-none font-bold bg-white">
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
          </select>
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("meal.compliance")}</h3>
          <select value={form.compliance} onChange={(e) => set({ compliance: e.target.value })}
            className="w-full p-3 border-2 border-border rounded-none font-bold bg-white">
            {COMPLIANCE.map((c) => <option key={c} value={c}>{t(`compliance.${c}`)}</option>)}
          </select>
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("entry.description")}</h3>
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3}
            className="w-full p-3 border-2 border-border rounded-none resize-none" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("meal.digestiveTracking")}</h3>
          <label className="flex items-center gap-3 p-3 border-2 border-border cursor-pointer">
            <input type="checkbox" checked={form.hasSymptoms}
              onChange={(e) => set({ hasSymptoms: e.target.checked })} className="w-5 h-5" />
            <span className="font-medium">{t("entry.symptoms")}</span>
          </label>
          {form.hasSymptoms && (
            <textarea value={form.symptomDescription} onChange={(e) => set({ symptomDescription: e.target.value })}
              rows={3} placeholder={t("entry.symptomsDesc")}
              className="w-full p-3 border-2 border-danger rounded-none resize-none bg-danger/5" />
          )}
        </section>
      </div>

      <div className="sticky bottom-0 z-30 bg-white p-4 border-t-2 border-border flex gap-3">
        <Button variant="primary" className="flex-1" disabled={!canSave} onClick={onSave}>{t("meal.saveChanges")}</Button>
        <Button variant="secondary" className="flex-1" onClick={() => navigate(`${linkBase}/${id}`)}>{t("common.cancel")}</Button>
      </div>
    </>
  );
}
