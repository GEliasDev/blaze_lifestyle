import { useParams } from "react-router-dom";

// The nutrition screens are shared between the client (acting on their own
// entries) and the coach (acting on a specific client's entries). The presence
// of a :clientId route param decides which API + link bases to use.
export function useNutritionScope() {
  const { clientId } = useParams();
  if (clientId) {
    return {
      isCoach: true,
      clientId,
      apiBase: `/coach/clients/${clientId}/entries`,
      linkBase: `/coach/clients/${clientId}/nutrition`,
    };
  }
  return {
    isCoach: false,
    clientId: null,
    apiBase: "/me/entries",
    linkBase: "/nutrition",
  };
}
