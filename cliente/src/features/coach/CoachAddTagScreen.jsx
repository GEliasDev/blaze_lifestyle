import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Button } from "../../components/Button.jsx";
import { TAG_COLOR_PALETTE } from "../exercise/tagColors.js";

// Reached via the "+" tab in CoachTagsBottomNav — creating a tag is its own
// screen now instead of an inline card on the list (see CoachTagsScreen.jsx).
export function CoachAddTagScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function onCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try { await api.post("/exercise-tags", { name: name.trim(), color }); navigate("/coach/tags"); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <>
      <AppHeader title={t("exercise.newTag").toUpperCase()} showBack backTo="/coach/tags" />
      <div className="p-4 space-y-6">
        <div className="border-2 border-border p-4 space-y-3">
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
      </div>
    </>
  );
}
