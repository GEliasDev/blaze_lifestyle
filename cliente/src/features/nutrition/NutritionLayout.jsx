import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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

const MIN_MASTER_WIDTH = 280;
const MAX_MASTER_WIDTH = 600;
const MASTER_WIDTH_KEY = "nutrition.masterWidth";
const RESIZE_STEP = 16;

function readStoredWidth() {
  const saved = Number(localStorage.getItem(MASTER_WIDTH_KEY));
  return saved >= MIN_MASTER_WIDTH && saved <= MAX_MASTER_WIDTH ? saved : 380;
}

function clampWidth(w) {
  return Math.min(MAX_MASTER_WIDTH, Math.max(MIN_MASTER_WIDTH, w));
}

// Master–detail shell for the nutrition module. Shared by the client and by the
// coach reviewing a client (the route's :clientId decides scope).
//   Mobile (<lg): single pane — the list, or the selected child, full-screen.
//   Desktop (lg+): the meal list (master) stays visible on the left while the
//   detail / add / edit route renders in the right pane. A drag handle between
//   them lets the coach/client resize the split; the width is remembered
//   across visits.
export function NutritionLayout() {
  const { t } = useTranslation();
  const { linkBase } = useNutritionScope();
  const { pathname } = useLocation();
  const atIndex = pathname === linkBase || pathname === `${linkBase}/`;
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const [masterWidth, setMasterWidth] = useState(readStoredWidth);
  const widthRef = useRef(masterWidth);
  const containerRef = useRef(null);
  useEffect(() => { widthRef.current = masterWidth; }, [masterWidth]);

  function onResizeStart(e) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onResizeMove(e) {
    if (e.buttons !== 1 || !containerRef.current) return;
    const left = containerRef.current.getBoundingClientRect().left;
    setMasterWidth(clampWidth(e.clientX - left));
  }
  function onResizeEnd(e) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    localStorage.setItem(MASTER_WIDTH_KEY, String(widthRef.current));
  }
  function onResizeKeyDown(e) {
    if (e.key === "ArrowLeft") setMasterWidth((w) => clampWidth(w - RESIZE_STEP));
    else if (e.key === "ArrowRight") setMasterWidth((w) => clampWidth(w + RESIZE_STEP));
    else if (e.key === "Home") setMasterWidth(MIN_MASTER_WIDTH);
    else if (e.key === "End") setMasterWidth(MAX_MASTER_WIDTH);
    else return;
    e.preventDefault();
    localStorage.setItem(MASTER_WIDTH_KEY, String(widthRef.current));
  }

  return (
    <NutritionListRefreshContext.Provider value={refresh}>
      <div
        ref={containerRef}
        className="h-dvh flex flex-col lg:grid"
        style={{ gridTemplateColumns: `${masterWidth}px 6px 1fr` }}
      >
        {/* Master: meal list. On mobile shown only when nothing is selected. */}
        <div className={`${atIndex ? "flex" : "hidden"} lg:flex flex-col flex-1 min-h-0 lg:h-dvh overflow-hidden`}>
          <NutritionScreen refreshKey={refreshKey} />
        </div>

        {/* Drag handle: desktop-only, resizes the master column. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t("nutrition.resizePanels")}
          tabIndex={0}
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onKeyDown={onResizeKeyDown}
          className="hidden lg:block w-1.5 cursor-col-resize bg-border hover:bg-primary focus:bg-primary focus:outline-none active:bg-primary transition-colors"
        />

        {/* Detail: selected meal / add / edit. On mobile shown only when active. */}
        <div className={`${atIndex ? "hidden" : "flex"} lg:flex flex-col flex-1 min-h-0 lg:h-dvh overflow-hidden`}>
          {atIndex ? <DetailPlaceholder /> : <Outlet />}
        </div>
      </div>
    </NutritionListRefreshContext.Provider>
  );
}
