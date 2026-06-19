import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { LoginScreen } from "../features/auth/LoginScreen.jsx";

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "coach" ? "/coach" : "/home"} replace />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginScreen /> },
  { path: "/", element: <RoleHome /> },
  { path: "/home", element: <div className="p-4 font-heading uppercase">Client home (next plan)</div> },
  { path: "/coach", element: <div className="p-4 font-heading uppercase">Coach panel (next plan)</div> },
]);
