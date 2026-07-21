import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Button } from "../../components/Button.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { useExerciseScope } from "./useExerciseScope.js";
import { TAG_COLOR_PALETTE } from "./tagColors.js";

// Each client's own tag set now (previously the coach's CoachTagsScreen) —
// shared by the plain client route (/exercise/tags) and the coach's own
// nested route (/coach/clients/:clientId/exercise/tags, same component tree
// as Home/Calendar/Add), same isCoach/showBack pattern as the rest of
// Exercise. A coach has the same full create/edit/delete access to any of
// their own clients' tags as they already have for entries — not read-only,
// not limited to their own "ME" pseudo-client (see coachExerciseController
// in the server's exercise.controller.js).
export function ExerciseTagsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isCoach, clientId, tagsBase, linkBase } = useExerciseScope();
  const [tags, setTags] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [confirmingTag, setConfirmingTag] = useState(null); // tag being deleted, or null
  const [deleting, setDeleting] = useState(false);
  const [editingTag, setEditingTag] = useState(null); // tag being edited, or null
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  function load() { api.get(tagsBase).then(setTags).catch(() => setTags([])); }
  useEffect(() => { load(); }, [tagsBase]);

  const filteredTags = useMemo(() => {
    if (!tags) return tags;
    const q = query.trim().toLowerCase();
    return q ? tags.filter((tag) => tag.name.toLowerCase().includes(q)) : tags;
  }, [tags, query]);

  async function onDelete() {
    setDeleting(true);
    setError(null);
    try { await api.del(`${tagsBase}/${confirmingTag.id}`); setConfirmingTag(null); load(); }
    catch (err) { setError(err.message); }
    finally { setDeleting(false); }
  }

  function openEdit(tag) {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditError(null);
  }

  async function onSaveEdit() {
    if (!editName.trim()) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await api.patch(`${tagsBase}/${editingTag.id}`, { name: editName.trim(), color: editColor });
      setEditingTag(null);
      load();
    } catch (err) { setEditError(err.message); }
    finally { setEditSaving(false); }
  }

  const addAction = (
    <button
      onClick={() => navigate(`${linkBase}/tags/add`)}
      aria-label={t("exercise.newTag")}
      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80"
    >
      <Plus className="w-6 h-6" />
    </button>
  );

  return (
    <>
      <AppHeader
        title={t("exercise.manageTags").toUpperCase()}
        showBack={isCoach}
        backTo={isCoach ? `/coach/clients/${clientId}` : null}
        desktopBackTo={isCoach ? "/coach" : null}
        action={addAction}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("exercise.searchTags")}
          aria-label={t("exercise.searchTags")}
          className="w-full p-3 pl-10 border-2 border-border rounded-none"
        />
      </label>

      {tags === null ? <Spinner /> : (
        <div className="space-y-2">
          {filteredTags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-3 border-2 border-border p-3">
              <span className={`w-4 h-4 bg-${tag.color}`} />
              <span className="font-heading uppercase tracking-wide font-bold flex-1">{tag.name}</span>
              <button onClick={() => openEdit(tag)} aria-label={t("exercise.editTag")} className="text-ink/60 p-2">
                <Pencil className="w-5 h-5" />
              </button>
              {!tag.inUse && (
                <button onClick={() => setConfirmingTag(tag)} aria-label={t("exercise.deleteTag")} className="text-danger p-2">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label={t("common.cancel")} onClick={() => setConfirmingTag(null)} className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white border-2 border-ink w-full max-w-sm p-4 space-y-4">
            <p className="font-medium">{t("exercise.deleteTagConfirm", { name: confirmingTag.name })}</p>
            {error && <p role="alert" className="text-danger text-sm">{error}</p>}
            <div className="flex gap-3">
              <Button variant="primary" className="flex-1 bg-danger border-danger" disabled={deleting} onClick={onDelete}>{t("exercise.deleteTag")}</Button>
              <Button variant="secondary" className="flex-1" disabled={deleting} onClick={() => setConfirmingTag(null)}>{t("common.cancel")}</Button>
            </div>
          </div>
        </div>
      )}

      {editingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label={t("common.cancel")} onClick={() => setEditingTag(null)} className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white border-2 border-ink w-full max-w-sm p-4 space-y-4">
            <h2 className="font-heading uppercase tracking-wide text-sm">{t("exercise.editTag")}</h2>
            {editingTag.inUse && (
              <p className="flex items-start gap-2 text-sm text-danger/90 border-2 border-danger/30 bg-danger/5 p-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {t("exercise.tagInUseWarning")}
              </p>
            )}
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t("exercise.tagName")}
              className="w-full p-3 border-2 border-border rounded-none" />
            <div className="flex flex-wrap gap-2">
              {TAG_COLOR_PALETTE.map((c) => (
                <button key={c} type="button" onClick={() => setEditColor(c)}
                  className={`w-8 h-8 bg-${c} ${editColor === c ? "ring-2 ring-offset-2 ring-ink" : ""}`} aria-label={c} />
              ))}
            </div>
            {editError && <p role="alert" className="text-danger text-sm">{editError}</p>}
            <div className="flex gap-3">
              <Button variant="primary" className="flex-1" disabled={!editName.trim() || editSaving} onClick={onSaveEdit}>{t("common.save")}</Button>
              <Button variant="secondary" className="flex-1" disabled={editSaving} onClick={() => setEditingTag(null)}>{t("common.cancel")}</Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
