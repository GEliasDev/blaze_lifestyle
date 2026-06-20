import { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, X } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Button } from "../../components/Button.jsx";

export function EvidenceScreen() {
  const { itemId } = useParams();
  const { state } = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [hasSymptoms, setHasSymptoms] = useState(false);
  const [symptomDescription, setSymptomDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));

  async function onSave() {
    setSaving(true);
    const form = new FormData();
    form.append("planItemId", itemId);
    form.append("eatenAt", new Date().toISOString());
    form.append("hasSymptoms", String(hasSymptoms));
    if (hasSymptoms && symptomDescription) form.append("symptomDescription", symptomDescription);
    files.forEach((f) => form.append("photos", f));
    try { await api.postForm("/me/entries", form); navigate("/plan"); }
    finally { setSaving(false); }
  }

  return (
    <>
      <AppHeader title={t("evidence.title").toUpperCase()} showBack />
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="border-2 border-border p-3">
          <div className="font-heading uppercase text-xs text-ink/60">{t("evidence.assigned")}{state?.category ? ` · ${t(`category.${state.category}`)}` : ""}</div>
          <div className="font-bold text-lg">{state?.title ?? ""}</div>
        </div>
        <div className="space-y-2">
          <span className="font-heading uppercase tracking-wide text-sm">{t("evidence.addPhotos")}</span>
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
            <span className="font-heading uppercase text-sm">{t("evidence.addPhotos")}</span>
            <input type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hasSymptoms} onChange={(e) => setHasSymptoms(e.target.checked)} className="w-5 h-5" />
          <span className="font-medium">{t("evidence.symptoms")}</span>
        </label>
        {hasSymptoms && <textarea value={symptomDescription} onChange={(e) => setSymptomDescription(e.target.value)} rows={2} placeholder={t("evidence.symptomsDesc")} className="w-full p-3 border-2 border-danger rounded-none" />}
      </div>
      <div className="p-4 border-t-2 border-border">
        <Button variant="primary" className="w-full" disabled={files.length === 0 || saving} onClick={onSave}>{t("evidence.save")}</Button>
      </div>
    </>
  );
}
