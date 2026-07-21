import { useParams } from "react-router-dom";

// Same :clientId-presence pattern as nutrition/useNutritionScope.js — the
// presence of a :clientId route param means a coach is viewing a client's
// data (read-only for Exercise; see ExerciseBottomNav for the reduced nav).
export function useExerciseScope() {
  const { clientId } = useParams();
  if (clientId) {
    return {
      isCoach: true,
      clientId,
      apiBase: `/coach/clients/${clientId}/exercise-entries`,
      statsBase: `/coach/clients/${clientId}/exercise-stats`,
      tagsBase: `/coach/clients/${clientId}/exercise-tags`,
      usedTagsBase: `/coach/clients/${clientId}/exercise-tags/used`,
      linkBase: `/coach/clients/${clientId}/exercise`,
    };
  }
  return {
    isCoach: false,
    clientId: null,
    apiBase: "/me/exercise-entries",
    statsBase: "/me/exercise-stats",
    tagsBase: "/me/exercise-tags",
    usedTagsBase: "/me/exercise-tags/used",
    linkBase: "/exercise",
  };
}
