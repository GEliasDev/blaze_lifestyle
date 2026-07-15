import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./lib/auth.jsx";
import { ModuleFlagsProvider } from "./lib/moduleFlags.jsx";
import { CoachStatusProvider } from "./lib/coachStatus.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { UpdateBanner } from "./components/UpdateBanner.jsx";
import { router } from "./app/router.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ModuleFlagsProvider>
          <CoachStatusProvider>
            <RouterProvider router={router} />
            <UpdateBanner />
          </CoachStatusProvider>
        </ModuleFlagsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
