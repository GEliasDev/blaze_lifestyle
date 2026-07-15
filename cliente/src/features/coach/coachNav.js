import { Users, Tag } from "lucide-react";

// Shared between CoachSidebar (desktop) and the AppHeader hamburger drawer
// (mobile) on every top-level coach screen, so both surfaces stay in sync.
export const COACH_NAV_ITEMS = [
  { to: "/coach", icon: Users, key: "coach.clients" },
  { to: "/coach/tags", icon: Tag, key: "exercise.manageTags" },
];
