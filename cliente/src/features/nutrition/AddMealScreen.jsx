import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, X } from "lucide-react";
import { api } from "../../lib/api.js";
import { compressImages } from "../../lib/imageCompress.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Button } from "../../components/Button.jsx";
import { useNutritionScope } from "./useNutritionScope.js";
import { useNutritionListRefresh } from "./NutritionLayout.jsx";

const CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];
const COMPLIANCE = ["na", "yes", "no"];
const MAX_PHOTOS = 5;

function today() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function AddMealScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiBase, linkBase } = useNutritionScope();
  const refreshList = useNutritionListRefresh();
  const [files, setFiles] = useState([]);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(now());
  const [category, setCategory] = useState("");
  const [compliance, setCompliance] = useState("na");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));
  const canSave = category && date && time && description.trim() && !saving && !compressing;

  function eatenAtISO() {
    return new Date(`${date}T${time}:00`).toISOString();
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
    form.append("category", category);
    form.append("eatenAt", eatenAtISO());
    form.append("compliance", compliance);
    if (description.trim()) form.append("description", description.trim());
    files.forEach((f) => form.append("photos", f));
    try { await api.postForm(apiBase, form); refreshList(); navigate(linkBase); }
    finally { setSaving(false); }
  }

  return (
    <>
      <AppHeader title={t("meal.new").toUpperCase()} showBack />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("meal.photos")} <span className="text-ink/40">{t("meal.maxPhotos")}</span></h3>
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
              <span className="font-heading uppercase text-sm">{compressing ? t("meal.processingPhotos") : t("meal.addPhotos")}</span>
              <span className="text-xs mt-1">{t("meal.addPhotosHint")}</span>
              <input type="file" accept="image/*" multiple className="hidden" disabled={compressing}
                onChange={(e) => onFilesPicked(e.target.files)} />
            </label>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("meal.date")}</h3>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("meal.time")}</h3>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("meal.type")}</h3>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 border-2 border-border rounded-none font-bold bg-white">
            <option value="" disabled>{t("meal.typePlaceholder")}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
          </select>
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("meal.compliance")}</h3>
          <select value={compliance} onChange={(e) => setCompliance(e.target.value)}
            className="w-full p-3 border-2 border-border rounded-none font-bold bg-white">
            {COMPLIANCE.map((c) => <option key={c} value={c}>{t(`compliance.${c}`)}</option>)}
          </select>
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("entry.description")}</h3>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder={t("meal.descriptionHint")}
            className="w-full p-3 border-2 border-border rounded-none resize-none" />
        </section>
      </div>

      <div className="sticky bottom-0 z-30 bg-white p-4 border-t-2 border-border">
        <Button variant="primary" className="w-full" disabled={!canSave} onClick={onSave}>{t("meal.save")}</Button>
      </div>
    </>
  );
}
