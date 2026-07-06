import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { api } from "../../lib/api.js";
import { useExerciseScope } from "./useExerciseScope.js";

// Read-only for clients — tags are created/deleted by a coach (see
// CoachTagsScreen.jsx under features/coach/).
export function ExerciseTagsScreen() {
  const { t } = useTranslation();
  const { isCoach, clientId } = useExerciseScope();
  const [tags, setTags] = useState(null);

  useEffect(() => { api.get("/exercise-tags").then(setTags).catch(() => setTags([])); }, []);

  return (
    <>
      <AppHeader
        title={t("exercise.tags").toUpperCase()}
        showBack={isCoach}
        backTo={isCoach ? `/coach/clients/${clientId}` : null}
        desktopBackTo={isCoach ? "/coach" : null}
      />
      <div className="flex-1 overflow-y-auto p-4">
        {tags === null ? <Spinner /> : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-3 border-2 border-border p-3">
                <span className={`w-4 h-4 bg-${tag.color}`} />
                <span className="font-heading uppercase tracking-wide font-bold flex-1">{tag.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
