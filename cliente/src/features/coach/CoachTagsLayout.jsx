import { Outlet } from "react-router-dom";
import { CoachTagsBottomNav } from "./CoachTagsBottomNav.jsx";

// Wraps the tags list and the add-tag screen with a persistent bottom nav,
// same shell pattern as Nutrition/Exercise: the routed screen scrolls in its
// own region while the nav stays pinned. CoachLayout's <main> is already
// sized to exactly the remaining viewport height (flex-1 min-h-0
// overflow-hidden), so this only needs to fill that, not redeclare h-dvh.
export function CoachTagsLayout() {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Outlet />
      </div>
      <CoachTagsBottomNav />
    </div>
  );
}
