import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { api } from "../../lib/api.js";
import { Button } from "../../components/Button.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { TAG_COLOR_PALETTE } from "../exercise/tagColors.js";

export function CoachTagsScreen() {
  const { t } = useTranslation();
  const [tags, setTags] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function load() { api.get("/exercise-tags").then(setTags).catch(() => setTags([])); }
  useEffect(() => { load(); }, []);

  async function onCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try { await api.post("/exercise-tags", { name: name.trim(), color }); setName(""); load(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function onDelete(id) {
    setError(null);
    try { await api.del(`/exercise-tags/${id}`); load(); }
    catch (err) { setError(err.message); }
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{t("exercise.manageTags")}</h1>

      <div className="border-2 border-border p-4 space-y-3">
        <h2 className="font-heading uppercase tracking-wide text-sm">{t("exercise.newTag")}</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("exercise.tagName")}
          className="w-full p-3 border-2 border-border rounded-none" />
        <div className="flex flex-wrap gap-2">
          {TAG_COLOR_PALETTE.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-8 h-8 bg-${c} ${color === c ? "ring-2 ring-offset-2 ring-ink" : ""}`} aria-label={c} />
          ))}
        </div>
        {error && <p role="alert" className="text-danger text-sm">{error}</p>}
        <Button variant="primary" className="w-full" disabled={!name.trim() || saving} onClick={onCreate}>{t("exercise.addTag")}</Button>
      </div>

      {tags === null ? <Spinner /> : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-3 border-2 border-border p-3">
              <span className={`w-4 h-4 bg-${tag.color}`} />
              <span className="font-heading uppercase tracking-wide font-bold flex-1">{tag.name}</span>
              {!tag.isSystem && (
                <button onClick={() => onDelete(tag.id)} aria-label={t("exercise.deleteTag")} className="text-danger p-2">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
