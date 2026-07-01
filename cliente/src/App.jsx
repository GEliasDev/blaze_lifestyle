import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./lib/auth.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { router } from "./app/router.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider><RouterProvider router={router} /></AuthProvider>
    </ErrorBoundary>
  );
}
