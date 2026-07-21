import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { useModuleFlags } from "../lib/moduleFlags.jsx";
import { useCoachStatus } from "../lib/coachStatus.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { PendingApprovalScreen } from "../features/account/PendingApprovalScreen.jsx";
import { LandingScreen } from "../features/landing/LandingScreen.jsx";
import { LoginScreen } from "../features/auth/LoginScreen.jsx";
import { RegisterScreen } from "../features/auth/RegisterScreen.jsx";
import { CoachLayout } from "../features/coach/CoachLayout.jsx";
import { ClientSidebar } from "../components/ClientSidebar.jsx";
import { ModulePlaceholder } from "../features/modules/ModulePlaceholder.jsx";
import { NutritionLayout } from "../features/nutrition/NutritionLayout.jsx";
import { AddMealScreen } from "../features/nutrition/AddMealScreen.jsx";
import { EntryDetailScreen } from "../features/nutrition/EntryDetailScreen.jsx";
import { EditEntryScreen } from "../features/nutrition/EditEntryScreen.jsx";
import { ExerciseLayout } from "../features/exercise/ExerciseLayout.jsx";
import { ExerciseHomeScreen } from "../features/exercise/ExerciseHomeScreen.jsx";
import { ExerciseCalendarScreen } from "../features/exercise/ExerciseCalendarScreen.jsx";
import { ExerciseAddScreen } from "../features/exercise/ExerciseAddScreen.jsx";
import { ExerciseEntryDetailScreen } from "../features/exercise/ExerciseEntryDetailScreen.jsx";
import { ExerciseEditEntryScreen } from "../features/exercise/ExerciseEditEntryScreen.jsx";
import { ExerciseTagsScreen } from "../features/exercise/ExerciseTagsScreen.jsx";
import { ExerciseAddTagScreen } from "../features/exercise/ExerciseAddTagScreen.jsx";
import { ClientsScreen } from "../features/coach/ClientsScreen.jsx";
import { CoachClientLayout } from "../features/coach/CoachClientLayout.jsx";
import { CoachClientHome } from "../features/coach/CoachClientHome.jsx";
import { SettingsScreen } from "../features/account/SettingsScreen.jsx";
import { SuperAdminLayout } from "../features/admin/SuperAdminLayout.jsx";
import { SuperAdminModulesScreen } from "../features/admin/SuperAdminModulesScreen.jsx";

// Gates a module's routes behind the superuser's on/off flag (see
// lib/moduleFlags.jsx). While flags are loading, shows a spinner instead of
// flashing the real module and then swapping to the placeholder a moment
// later. Rendered as the pathless parent of a module's route subtree, so it
// only needs one Outlet to hand off to the module's own layout.
//
// Flags are re-polled periodically (moduleFlags.jsx), so a module can flip
// to disabled while someone is already using it. If they're mid-write (an
// add/edit screen), don't yank the screen out from under them and lose
// whatever they were typing — let them finish; the placeholder takes over
// as soon as they navigate anywhere else. Read-only screens (list, detail)
// have nothing to lose, so those switch over immediately.
function ModuleGate({ moduleKey, titleKey }) {
  const { flags } = useModuleFlags();
  const { pathname } = useLocation();
  const isWriting = /\/(add|edit)(\/|$)/.test(pathname);
  if (flags === null) return <Spinner />;
  if (flags[moduleKey] === false && !isWriting) {
    return <ModulePlaceholder titleKey={titleKey} messageKey="module.underMaintenance" />;
  }
  return <Outlet />;
}

function moduleRoute(path, moduleKey, titleKey, layoutElement, children) {
  return {
    path,
    element: <ModuleGate moduleKey={moduleKey} titleKey={titleKey} />,
    children: [{ element: layoutElement, children }],
  };
}

function RequireRole({ role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Blocks the whole client app behind the coach's accept/reject decision (see
// coaching.service.js's setClientStatus). A client with no coach link at all
// isn't gated — that covers clients who predate this feature, back when a
// coach code was optional. coachStatus is polled (lib/coachStatus.jsx), so
// this clears on its own once the coach accepts them, no refresh needed.
function RequireApprovedClient() {
  const { coachStatus } = useCoachStatus();
  if (coachStatus === null) return <Spinner />;
  if (coachStatus.hasCoach && coachStatus.status !== "approved") return <PendingApprovalScreen />;
  return <Outlet />;
}

// "/" is the public landing page for logged-out visitors; a logged-in user
// lands straight on their dashboard instead of seeing marketing copy again.
function RoleHome() {
  const { user } = useAuth();
  if (!user) return <LandingScreen />;
  if (user.role === "coach") return <Navigate to="/coach" replace />;
  if (user.role === "superuser") return <Navigate to="/admin" replace />;
  return <Navigate to="/nutrition" replace />;
}

// Client shell. Mobile: centered column, navigation via the header hamburger.
// Desktop (lg+): persistent module sidebar on the left + content on the right.
// h-dvh (not min-h-dvh) so this is capped to exactly the viewport height —
// otherwise mobile overscroll bounce can drag the whole page (and any sticky
// bottom nav inside it) along with the gesture instead of staying put.
function ClientShell() {
  return (
    <div className="h-dvh flex flex-col lg:grid lg:grid-cols-[220px_1fr] bg-white">
      <ClientSidebar />
      <div className="min-w-0 flex-1 min-h-0 flex flex-col overflow-hidden mx-auto w-full max-w-[480px] lg:max-w-none lg:mx-0">
        <Outlet />
      </div>
    </div>
  );
}

export const routes = [
  { path: "/login", element: <LoginScreen /> },
  { path: "/register", element: <RegisterScreen /> },
  { path: "/", element: <RoleHome /> },
  {
    element: <RequireRole role="client" />,
    children: [
      {
        element: <RequireApprovedClient />,
        children: [
          {
            element: <ClientShell />,
            children: [
              moduleRoute("/nutrition", "nutrition", "module.nutrition", <NutritionLayout />, [
                // NutritionLayout renders its own list directly (no Outlet) when
                // there's no further path — but react-router still needs a
                // matching child route to select it as the layout at all, so
                // this index route exists purely to satisfy that; its element is
                // never actually used.
                { index: true, element: null },
                { path: "add", element: <AddMealScreen /> },
                { path: ":id", element: <EntryDetailScreen /> },
                { path: ":id/edit", element: <EditEntryScreen /> },
              ]),
              moduleRoute("/exercise", "exercise", "module.exercise", <ExerciseLayout />, [
                { index: true, element: <ExerciseHomeScreen /> },
                { path: "calendar", element: <ExerciseCalendarScreen /> },
                { path: "tags", element: <ExerciseTagsScreen /> },
                { path: "tags/add", element: <ExerciseAddTagScreen /> },
                { path: "add", element: <ExerciseAddScreen /> },
                { path: ":id", element: <ExerciseEntryDetailScreen /> },
                { path: ":id/edit", element: <ExerciseEditEntryScreen /> },
              ]),
              { path: "/sleep", element: <ModulePlaceholder titleKey="module.sleep" /> },
              { path: "/body-comp", element: <ModulePlaceholder titleKey="module.bodyComp" /> },
              { path: "/settings", element: <SettingsScreen /> },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="coach" />,
    children: [
      {
        element: <CoachLayout />,
        children: [
          { path: "/coach", element: <ClientsScreen /> },
          { path: "/coach/settings", element: <SettingsScreen /> },
        ],
      },
      // Coach reviewing one client. Desktop shows [module sidebar · list ·
      // detail] in one view (CoachClientLayout mirrors the client's ClientShell);
      // entering a client lands straight on nutrition, no separate module step.
      {
        path: "/coach/clients/:clientId",
        element: <CoachClientLayout />,
        children: [
          { index: true, element: <CoachClientHome /> },
          moduleRoute("nutrition", "nutrition", "module.nutrition", <NutritionLayout />, [
            { index: true, element: null },
            { path: "add", element: <AddMealScreen /> },
            { path: ":id", element: <EntryDetailScreen /> },
            { path: ":id/edit", element: <EditEntryScreen /> },
          ]),
          moduleRoute("exercise", "exercise", "module.exercise", <ExerciseLayout />, [
            { index: true, element: <ExerciseHomeScreen /> },
            { path: "calendar", element: <ExerciseCalendarScreen /> },
            { path: "tags", element: <ExerciseTagsScreen /> },
            { path: "tags/add", element: <ExerciseAddTagScreen /> },
            { path: "add", element: <ExerciseAddScreen /> },
            { path: ":id", element: <ExerciseEntryDetailScreen /> },
            { path: ":id/edit", element: <ExerciseEditEntryScreen /> },
          ]),
        ],
      },
    ],
  },
  {
    element: <RequireRole role="superuser" />,
    children: [
      {
        element: <SuperAdminLayout />,
        children: [{ path: "/admin", element: <SuperAdminModulesScreen /> }],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
