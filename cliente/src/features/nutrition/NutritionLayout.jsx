import { createContext, useCallback, useContext, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NutritionScreen } from "./NutritionScreen.jsx";
import { NutritionBottomNav } from "./NutritionBottomNav.jsx";
import { useNutritionScope } from "./useNutritionScope.js";

// The meal list (NutritionScreen) only stays mounted while the index route is
// active — navigating to add/detail/edit unmounts it (see below), so on
// return it always fetches fresh data on its own. This context lets the
// mutating screens (add, edit, delete) also nudge an immediate refetch
// rather than waiting on that natural remount.
const NutritionListRefreshContext = createContext(() => {});
export function useNutritionListRefresh() {
  return useContext(NutritionListRefreshContext);
}

// Single-pane shell for the nutrition module, same pattern as Exercise
// (ExerciseLayout): one full-screen view at a time — the meal list, or the
// active add/detail/edit route — with a persistent bottom tab bar, identical
// on mobile and desktop (no desktop-only split view). Shared by the client
// and by the coach reviewing a client (the route's :clientId decides scope).
export function NutritionLayout() {
  const { linkBase } = useNutritionScope();
  const { pathname } = useLocation();
  const atIndex = pathname === linkBase || pathname === `${linkBase}/`;
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <NutritionListRefreshContext.Provider value={refresh}>
      <div className="h-dvh flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {atIndex ? <NutritionScreen refreshKey={refreshKey} /> : <Outlet />}
        </div>
        <NutritionBottomNav linkBase={linkBase} />
      </div>
    </NutritionListRefreshContext.Provider>
  );
}
