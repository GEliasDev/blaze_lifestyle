import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { LoginScreen } from "../features/auth/LoginScreen.jsx";
import { RegisterScreen } from "../features/auth/RegisterScreen.jsx";
import { BottomNav } from "../components/BottomNav.jsx";
import { CoachLayout } from "../features/coach/CoachLayout.jsx";
import { TimelineScreen } from "../features/nutrition/TimelineScreen.jsx";
import { EvidenceScreen } from "../features/nutrition/EvidenceScreen.jsx";
import { EntryDetailScreen } from "../features/nutrition/EntryDetailScreen.jsx";
import { MyPlanScreen } from "../features/nutrition/MyPlanScreen.jsx";
import { ClientsScreen } from "../features/coach/ClientsScreen.jsx";
import { ClientDetailScreen } from "../features/coach/ClientDetailScreen.jsx";
import { PlanEditorScreen } from "../features/coach/PlanEditorScreen.jsx";
import { CoachEntryScreen } from "../features/coach/CoachEntryScreen.jsx";
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
  return <Navigate to={user.role === "coach" ? "/coach" : "/home"} replace />;
}

// Client shell: centered mobile column + bottom nav
function ClientShell() {
  return (
    <div className="mx-auto max-w-[480px] min-h-dvh flex flex-col bg-white">
      <div className="flex-1 flex flex-col"><Outlet /></div>
      <BottomNav />
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
          { path: "/home", element: <TimelineScreen /> },
          { path: "/evidence/:itemId", element: <EvidenceScreen /> },
          { path: "/entry/:id", element: <EntryDetailScreen /> },
          { path: "/plan", element: <MyPlanScreen /> },
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
          { path: "/coach/clients/:id", element: <ClientDetailScreen /> },
          { path: "/coach/clients/:id/plan", element: <PlanEditorScreen /> },
          { path: "/coach/entries/:id", element: <CoachEntryScreen /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
