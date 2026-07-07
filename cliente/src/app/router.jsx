import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
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
import { ExerciseTagsScreen } from "../features/exercise/ExerciseTagsScreen.jsx";
import { ExerciseEntryDetailScreen } from "../features/exercise/ExerciseEntryDetailScreen.jsx";
import { ExerciseEditEntryScreen } from "../features/exercise/ExerciseEditEntryScreen.jsx";
import { ClientsScreen } from "../features/coach/ClientsScreen.jsx";
import { CoachTagsScreen } from "../features/coach/CoachTagsScreen.jsx";
import { CoachClientLayout } from "../features/coach/CoachClientLayout.jsx";
import { CoachClientHome } from "../features/coach/CoachClientHome.jsx";
import { SettingsScreen } from "../features/account/SettingsScreen.jsx";

function RequireRole({ role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "coach" ? "/coach" : "/nutrition"} replace />;
}

// Client shell. Mobile: centered column, navigation via the header hamburger.
// Desktop (lg+): persistent module sidebar on the left + content on the right.
function ClientShell() {
  return (
    <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[220px_1fr]">
      <ClientSidebar />
      <div className="min-w-0 flex flex-col min-h-dvh mx-auto w-full max-w-[480px] lg:max-w-none lg:mx-0">
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
        element: <ClientShell />,
        children: [
          {
            path: "/nutrition",
            element: <NutritionLayout />,
            children: [
              { path: "add", element: <AddMealScreen /> },
              { path: ":id", element: <EntryDetailScreen /> },
              { path: ":id/edit", element: <EditEntryScreen /> },
            ],
          },
          {
            path: "/exercise",
            element: <ExerciseLayout />,
            children: [
              { index: true, element: <ExerciseHomeScreen /> },
              { path: "calendar", element: <ExerciseCalendarScreen /> },
              { path: "tags", element: <ExerciseTagsScreen /> },
              { path: "add", element: <ExerciseAddScreen /> },
              { path: ":id", element: <ExerciseEntryDetailScreen /> },
              { path: ":id/edit", element: <ExerciseEditEntryScreen /> },
            ],
          },
          { path: "/sleep", element: <ModulePlaceholder titleKey="module.sleep" /> },
          { path: "/body-comp", element: <ModulePlaceholder titleKey="module.bodyComp" /> },
          { path: "/settings", element: <SettingsScreen /> },
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
          { path: "/coach/tags", element: <CoachTagsScreen /> },
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
          {
            path: "nutrition",
            element: <NutritionLayout />,
            children: [
              { path: "add", element: <AddMealScreen /> },
              { path: ":id", element: <EntryDetailScreen /> },
              { path: ":id/edit", element: <EditEntryScreen /> },
            ],
          },
          {
            path: "exercise",
            element: <ExerciseLayout />,
            children: [
              { index: true, element: <ExerciseHomeScreen /> },
              { path: "calendar", element: <ExerciseCalendarScreen /> },
              { path: "tags", element: <ExerciseTagsScreen /> },
              { path: "add", element: <ExerciseAddScreen /> },
              { path: ":id", element: <ExerciseEntryDetailScreen /> },
              { path: ":id/edit", element: <ExerciseEditEntryScreen /> },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
