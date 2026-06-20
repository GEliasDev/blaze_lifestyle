import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, X } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Button } from "../../components/Button.jsx";

const CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];
const field = "w-full p-3 border-2 border-border rounded-none bg-white";
const label = "font-heading uppercase tracking-wide text-sm";

export function AddEntryScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState("");
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [compliance, setCompliance] = useState("na");
  const [description, setDescription] = useState("");
  const [hasSymptoms, setHasSymptoms] = useState(false);
  const [symptomDescription, setSymptomDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));
  const valid = files.length > 0 && category;

  async function onSave() {
    setSaving(true);
    const form = new FormData();
    form.append("category", category);
    form.append("eatenAt", new Date(`${new Date().toISOString().slice(0, 10)}T${time}:00`).toISOString());
    form.append("clientCompliance", compliance);
    if (description) form.append("description", description);
    form.append("hasSymptoms", String(hasSymptoms));
    if (hasSymptoms && symptomDescription) form.append("symptomDescription", symptomDescription);
    files.forEach((f) => form.append("photos", f));
    try { await api.postForm("/me/entries", form); navigate("/home"); }
    finally { setSaving(false); }
  }

  return (
    <>
      <AppHeader title={t("entry.new").toUpperCase()} showBack />
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-2">
          <span className={label}>{t("entry.photos")}</span>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p.url} alt="" className="w-full h-24 object-cover border-2 border-border" />
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-danger text-white p-1" aria-label="remove"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
          <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-ink/40 cursor-pointer">
            <Camera className="w-7 h-7 mb-1" />
            <span className="font-heading uppercase text-sm">{t("entry.addPhotos")}</span>
            <input type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />
          </label>
        </div>
        <label className="block space-y-1"><span className={label}>{t("entry.time")}</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} /></label>
        <label className="block space-y-1"><span className={label}>{t("entry.type")}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            <option value="" disabled>—</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
          </select></label>
        <label className="block space-y-1"><span className={label}>{t("entry.compliance")}</span>
          <select value={compliance} onChange={(e) => setCompliance(e.target.value)} className={field}>
            <option value="na">{t("compliance.na")}</option>
            <option value="yes">{t("compliance.yes")}</option>
            <option value="no">{t("compliance.no")}</option>
          </select></label>
        <label className="block space-y-1"><span className={label}>{t("entry.description")}</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={field} /></label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hasSymptoms} onChange={(e) => setHasSymptoms(e.target.checked)} className="w-5 h-5" />
          <span className="font-medium">{t("entry.symptoms")}</span></label>
        {hasSymptoms && <textarea value={symptomDescription} onChange={(e) => setSymptomDescription(e.target.value)} rows={2} placeholder={t("entry.symptomsDesc")} className={`${field} border-danger`} />}
      </div>
      <div className="p-4 border-t-2 border-border">
        <Button variant="primary" className="w-full" disabled={!valid || saving} onClick={onSave}>{t("entry.save")}</Button>
      </div>
    </>
  );
}
