import { Users } from "lucide-react";

// Shared between CoachSidebar (desktop) and the AppHeader hamburger drawer
// (mobile) on every top-level coach screen, so both surfaces stay in sync.
// Tags moved off this nav — each client manages their own now (see
// ExerciseTagsScreen.jsx), reachable from the Exercise module's own bottom
// nav instead of the coach panel.
export const COACH_NAV_ITEMS = [
  { to: "/coach", icon: Users, key: "coach.clients" },
];
