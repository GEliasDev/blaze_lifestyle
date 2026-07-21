import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, X } from "lucide-react";
import { api } from "../../lib/api.js";

// Multi-select tag picker: chosen tags collapse into removable chips up top
// (same pattern as the calendar's tag filter). The search + list stays
// collapsed behind an "add another tag" button once at least one tag is
// picked — showing every remaining tag right away got noisy fast, so it only
// expands on request, and re-collapses after each pick instead of staying
// open. Sorted with this client's most frequently used tags first (see
// exercise.service.js usedTagIds).
export function ExerciseTagPicker({ tagsBase, usedTagsBase, selectedTagIds, onToggle }) {
  const { t } = useTranslation();
  const [tags, setTags] = useState(null);
  const [usedTagIds, setUsedTagIds] = useState([]);
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    api.get(tagsBase).then(setTags).catch(() => setTags([]));
    api.get(usedTagsBase).then(setUsedTagIds).catch(() => setUsedTagIds([]));
  }, [tagsBase, usedTagsBase]);

  const usedSet = useMemo(() => new Set(usedTagIds), [usedTagIds]);

  const sortedTags = useMemo(() => {
    if (!tags) return [];
    const rank = new Map(usedTagIds.map((id, i) => [id, i]));
    return [...tags].sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id) : Infinity;
      const rb = rank.has(b.id) ? rank.get(b.id) : Infinity;
      return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
    });
  }, [tags, usedTagIds]);

  const selectedTags = useMemo(
    () => sortedTags.filter((tag) => selectedTagIds.includes(tag.id)),
    [sortedTags, selectedTagIds],
  );

  const allUnselectedTags = useMemo(
    () => sortedTags.filter((tag) => !selectedTagIds.includes(tag.id)),
    [sortedTags, selectedTagIds],
  );

  const unselectedTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? allUnselectedTags.filter((tag) => tag.name.toLowerCase().includes(q)) : allUnselectedTags;
  }, [allUnselectedTags, query]);

  if (tags === null) return <p className="text-sm text-ink/50">{t("common.loading")}</p>;

  // Picking a new tag collapses the list back down instead of leaving it
  // open — matches the old single-select behavior, just re-openable via the
  // "add another" button. Removing a chip (already-selected id) doesn't
  // need to collapse/expand anything.
  function pick(tagId) {
    onToggle(tagId);
    if (!selectedTagIds.includes(tagId)) {
      setPicking(false);
      setQuery("");
    }
  }

  const showList = selectedTags.length === 0 || picking;
  const canAddMore = allUnselectedTags.length > 0;

  return (
    <div className="space-y-2">
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => pick(tag.id)}
              className={`flex items-center gap-2 px-3 py-2 border-2 border-transparent bg-${tag.color} text-white`}
            >
              <span className="font-heading uppercase tracking-wide font-bold text-sm">{tag.name}</span>
              <X className="w-4 h-4 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {showList ? (
        <>
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
          <div className="max-h-56 overflow-y-auto border-2 border-border divide-y-2 divide-border">
            {unselectedTags.length === 0 ? (
              <p className="p-3 text-sm text-ink/50 text-center">{t("exercise.noTagsFound")}</p>
            ) : (
              unselectedTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => pick(tag.id)}
                  className="w-full flex items-center gap-3 p-3 text-left min-h-[44px] bg-white text-ink"
                >
                  <span className={`w-4 h-4 shrink-0 bg-${tag.color}`} />
                  <span className="font-heading uppercase tracking-wide font-bold flex-1">{tag.name}</span>
                  {usedSet.has(tag.id) && (
                    <span className="shrink-0 text-xs font-heading uppercase tracking-wide px-1.5 py-0.5 border border-ink/30 text-ink/50">
                      {t("exercise.usedBadge")}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      ) : canAddMore ? (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-ink/40 text-ink/60 min-h-[44px]"
        >
          <Plus className="w-5 h-5" />
          <span className="font-heading uppercase tracking-wide text-sm">{t("exercise.addAnotherTag")}</span>
        </button>
      ) : null}
    </div>
  );
}
