import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { api } from "../../lib/api.js";

// Search + vertical list tag picker, sorted with this client's most
// frequently used tags first (see exercise.service.js usedTagIds) — a flat
// grid of every tag stops scaling once there's more than a handful.
export function ExerciseTagPicker({ usedTagsBase, selectedTagId, onSelect }) {
  const { t } = useTranslation();
  const [tags, setTags] = useState(null);
  const [usedTagIds, setUsedTagIds] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.get("/exercise-tags").then(setTags).catch(() => setTags([]));
    api.get(usedTagsBase).then(setUsedTagIds).catch(() => setUsedTagIds([]));
  }, [usedTagsBase]);

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

  const filteredTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? sortedTags.filter((tag) => tag.name.toLowerCase().includes(q)) : sortedTags;
  }, [sortedTags, query]);

  if (tags === null) return <p className="text-sm text-ink/50">{t("common.loading")}</p>;

  // Once a tag is picked, collapse the search/list down to just that choice —
  // it reopens only if the coach/client removes it (the X below), instead of
  // staying expanded and inviting a second pick.
  const selectedTag = tags.find((tag) => tag.id === selectedTagId);
  if (selectedTag) {
    return (
      <button
        type="button"
        onClick={() => onSelect(selectedTag.id)}
        className={`w-full flex items-center gap-3 p-3 border-2 border-transparent bg-${selectedTag.color} text-white`}
      >
        <span className="flex-1 text-left font-heading uppercase tracking-wide font-bold">{selectedTag.name}</span>
        <X className="w-5 h-5 shrink-0" />
      </button>
    );
  }

  return (
    <div className="space-y-2">
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
        {filteredTags.length === 0 ? (
          <p className="p-3 text-sm text-ink/50 text-center">{t("exercise.noTagsFound")}</p>
        ) : (
          filteredTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onSelect(tag.id)}
              aria-pressed={selectedTagId === tag.id}
              className={`w-full flex items-center gap-3 p-3 text-left min-h-[44px] ${selectedTagId === tag.id ? "bg-ink text-white" : "bg-white text-ink"}`}
            >
              <span className={`w-4 h-4 shrink-0 bg-${tag.color}`} />
              <span className="font-heading uppercase tracking-wide font-bold flex-1">{tag.name}</span>
              {usedSet.has(tag.id) && (
                <span className={`shrink-0 text-xs font-heading uppercase tracking-wide px-1.5 py-0.5 border ${selectedTagId === tag.id ? "border-white/60 text-white/80" : "border-ink/30 text-ink/50"}`}>
                  {t("exercise.usedBadge")}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
