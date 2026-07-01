import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { LoginScreen } from "../features/auth/LoginScreen.jsx";
import { RegisterScreen } from "../features/auth/RegisterScreen.jsx";
import { CoachLayout } from "../features/coach/CoachLayout.jsx";
import { ModulePlaceholder } from "../features/modules/ModulePlaceholder.jsx";
import { NutritionScreen } from "../features/nutrition/NutritionScreen.jsx";
import { AddMealScreen } from "../features/nutrition/AddMealScreen.jsx";
import { EntryDetailScreen } from "../features/nutrition/EntryDetailScreen.jsx";
import { EditEntryScreen } from "../features/nutrition/EditEntryScreen.jsx";
import { ClientsScreen } from "../features/coach/ClientsScreen.jsx";
import { ClientModulesScreen } from "../features/coach/ClientModulesScreen.jsx";
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

// Client shell: centered mobile column; navigation lives in the header menu
function ClientShell() {
  return (
    <div className="mx-auto max-w-[480px] min-h-dvh flex flex-col bg-white">
      <div className="flex-1 flex flex-col"><Outlet /></div>
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
          { path: "/nutrition", element: <NutritionScreen /> },
          { path: "/nutrition/add", element: <AddMealScreen /> },
          { path: "/nutrition/:id", element: <EntryDetailScreen /> },
          { path: "/nutrition/:id/edit", element: <EditEntryScreen /> },
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
      // Full-screen (outside CoachLayout): client modules sidebar, full width on mobile
      { path: "/coach/clients/:id", element: <ClientModulesScreen /> },
      // Coach managing a client's Nutrition module (reuses the client screens via :clientId scope)
      { path: "/coach/clients/:clientId/nutrition", element: <NutritionScreen /> },
      { path: "/coach/clients/:clientId/nutrition/add", element: <AddMealScreen /> },
      { path: "/coach/clients/:clientId/nutrition/:id", element: <EntryDetailScreen /> },
      { path: "/coach/clients/:clientId/nutrition/:id/edit", element: <EditEntryScreen /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
