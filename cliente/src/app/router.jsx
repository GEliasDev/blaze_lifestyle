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
import { ClientsScreen } from "../features/coach/ClientsScreen.jsx";
import { CoachClientLayout } from "../features/coach/CoachClientLayout.jsx";
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
          { path: "/exercise", element: <ModulePlaceholder titleKey="module.exercise" /> },
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
        ],
      },
      // Coach reviewing one client. Desktop shows [module sidebar · list ·
      // detail] in one view (CoachClientLayout mirrors the client's ClientShell);
      // entering a client lands straight on nutrition, no separate module step.
      {
        path: "/coach/clients/:clientId",
        element: <CoachClientLayout />,
        children: [
          { index: true, element: <Navigate to="nutrition" replace /> },
          {
            path: "nutrition",
            element: <NutritionLayout />,
            children: [
              { path: "add", element: <AddMealScreen /> },
              { path: ":id", element: <EntryDetailScreen /> },
              { path: ":id/edit", element: <EditEntryScreen /> },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
