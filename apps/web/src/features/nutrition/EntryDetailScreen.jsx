import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, Trash2 } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { ComplianceBadge } from "../../components/ComplianceBadge.jsx";
import { Button } from "../../components/Button.jsx";

export function EntryDetailScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  useEffect(() => { api.get(`/me/entries/${id}`).then(setEntry).catch(() => {}); }, [id]);
  if (!entry) return (<><AppHeader title={t("entry.detail").toUpperCase()} showBack /><Spinner /></>);

  async function onDelete() { await api.del(`/me/entries/${id}`); navigate("/home"); }

  return (
    <>
      <AppHeader title={t("entry.detail").toUpperCase()} showBack />
      <div className="flex-1 overflow-y-auto">
        {entry.photos?.length > 0 && (
          <div className="grid grid-cols-2 gap-1">
            {entry.photos.map((p, i) => <AuthImage key={i} path={`/photos/${p.storageKey}`} className="w-full h-40 object-cover" />)}
          </div>
        )}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading uppercase tracking-wide text-xl font-bold">{t(`category.${entry.category}`)}</h2>
            <ComplianceBadge value={entry.coachCompliance ?? "pending"} />
          </div>
          <div className={`flex items-center gap-2 font-heading uppercase text-sm ${entry.hasSymptoms ? "text-danger" : "text-ink/60"}`}>
            {entry.hasSymptoms ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            {entry.hasSymptoms ? entry.symptomDescription || t("entry.symptoms") : "OK"}
          </div>
          <div>
            <h3 className="font-heading uppercase tracking-wide text-sm mb-2">{t("entry.comments")}</h3>
            {(!entry.comments || entry.comments.length === 0) && <p className="text-ink/50 text-sm">{t("entry.noComments")}</p>}
            <div className="space-y-2">
              {entry.comments?.map((c) => <div key={c.id} className="border-2 border-border p-3 bg-muted text-sm">{c.body}</div>)}
            </div>
          </div>
          <Button variant="secondary" className="w-full flex items-center justify-center gap-2" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />{t("entry.delete")}
          </Button>
        </div>
      </div>
    </>
  );
}
