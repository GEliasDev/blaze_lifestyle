import { createContext, useCallback, useContext, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NutritionScreen } from "./NutritionScreen.jsx";
import { useNutritionScope } from "./useNutritionScope.js";

// The meal list (NutritionScreen) is mounted once by this layout and stays
// mounted while add/detail/edit routes change in the sibling pane — that's
// what makes the desktop master–detail view work without losing list scroll
// state. But it also means the list's own fetch effect won't re-run just
// because we navigated. This context lets the mutating screens (add, edit,
// delete) tell the list "data changed, refetch" after they succeed.
const NutritionListRefreshContext = createContext(() => {});
export function useNutritionListRefresh() {
  return useContext(NutritionListRefreshContext);
}

// Empty state for the detail pane on desktop, shown when no meal is selected.
function DetailPlaceholder() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-muted text-ink/40 font-heading uppercase tracking-wide text-sm">
      {t("entry.selectMeal")}
    </div>
  );
}

// Master–detail shell for the nutrition module. Shared by the client and by the
// coach reviewing a client (the route's :clientId decides scope).
//   Mobile (<lg): single pane — the list, or the selected child, full-screen.
//   Desktop (lg+): the meal list (master) stays visible on the left while the
//   detail / add / edit route renders in the right pane.
export function NutritionLayout() {
  const { linkBase } = useNutritionScope();
  const { pathname } = useLocation();
  const atIndex = pathname === linkBase || pathname === `${linkBase}/`;
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <NutritionListRefreshContext.Provider value={refresh}>
      <div className="min-h-dvh flex flex-col lg:grid lg:grid-cols-[minmax(320px,380px)_1fr] lg:h-dvh">
        {/* Master: meal list. On mobile shown only when nothing is selected. */}
        <div className={`${atIndex ? "flex" : "hidden"} lg:flex flex-col flex-1 min-h-0 lg:h-dvh overflow-hidden lg:border-r-2 lg:border-border`}>
          <NutritionScreen refreshKey={refreshKey} />
        </div>
        {/* Detail: selected meal / add / edit. On mobile shown only when active. */}
        <div className={`${atIndex ? "hidden" : "flex"} lg:flex flex-col flex-1 min-h-0 lg:h-dvh overflow-hidden`}>
          {atIndex ? <DetailPlaceholder /> : <Outlet />}
        </div>
      </div>
    </NutritionListRefreshContext.Provider>
  );
}
