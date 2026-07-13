import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./lib/auth.jsx";
import { ModuleFlagsProvider } from "./lib/moduleFlags.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { router } from "./app/router.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ModuleFlagsProvider>
          <RouterProvider router={router} />
        </ModuleFlagsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
