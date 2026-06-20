import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { Spinner } from "../../components/Spinner.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { ComplianceBadge } from "../../components/ComplianceBadge.jsx";
import { Button } from "../../components/Button.jsx";

export function CoachEntryScreen() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const clientId = params.get("client");
  const { t } = useTranslation();
  const [entry, setEntry] = useState(null);
  const [comment, setComment] = useState("");

  const load = useCallback(() => { api.get(`/coach/clients/${clientId}/entries/${id}`).then(setEntry).catch(() => {}); }, [clientId, id]);
  useEffect(() => { load(); }, [load]);
  if (!entry) return <Spinner />;

  async function addComment(e) { e.preventDefault(); await api.post(`/coach/entries/${id}/comments`, { body: comment }); setComment(""); load(); }
  async function setCompliance(value) { await api.patch(`/coach/entries/${id}/compliance`, { coachCompliance: value }); load(); }

  return (
    <div className="p-4 space-y-5 max-w-2xl">
      {entry.photos?.length > 0 && (
        <div className="grid grid-cols-2 gap-1">{entry.photos.map((p, i) => <AuthImage key={i} path={`/photos/${p.storageKey}`} className="w-full h-48 object-cover" />)}</div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="font-heading uppercase tracking-wide text-2xl">{t(`category.${entry.category}`)}</h1>
        <ComplianceBadge value={entry.coachCompliance ?? entry.clientCompliance} />
      </div>
      {entry.description && <p className="text-ink/70">{entry.description}</p>}
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => setCompliance("yes")}>{t("compliance.yes")}</Button>
        <Button variant="secondary" onClick={() => setCompliance("no")}>{t("compliance.no")}</Button>
      </div>
      <div className="space-y-2">
        <h3 className="font-heading uppercase tracking-wide text-sm">{t("entry.comments")}</h3>
        {entry.comments?.map((c) => <div key={c.id} className="border-2 border-border p-3 bg-muted text-sm">{c.body}</div>)}
        <form onSubmit={addComment} className="flex gap-2">
          <input className="flex-1 p-3 border-2 border-border rounded-none" value={comment} onChange={(e) => setComment(e.target.value)} required />
          <Button type="submit" variant="primary">{t("coach.addComment")}</Button>
        </form>
      </div>
    </div>
  );
}
