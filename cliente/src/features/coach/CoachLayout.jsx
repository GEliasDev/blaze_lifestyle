import { Outlet } from "react-router-dom";
import { CoachSidebar } from "../../components/CoachSidebar.jsx";

// Mirrors ClientShell (app/router.jsx): a persistent sidebar on desktop
// (lg+), completely hidden on mobile — each routed screen's own AppHeader
// carries the hamburger drawer for navigation there instead (see
// coachNav.js's COACH_NAV_ITEMS, passed into AppHeader by ClientsScreen/
// CoachTagsScreen/CoachSettingsScreen).
export function CoachLayout() {
  return (
    <div className="h-dvh flex flex-col lg:grid lg:grid-cols-[220px_1fr] bg-white">
      <CoachSidebar />
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden"><Outlet /></main>
    </div>
  );
}
