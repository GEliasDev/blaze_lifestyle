import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./lib/auth.jsx";
import { LoginScreen } from "./features/auth/LoginScreen.jsx";
import "./lib/i18n.js";

// App now renders AuthProvider + RouterProvider (createBrowserRouter).
// createBrowserRouter triggers internal navigation in jsdom that causes an
// AbortSignal incompatibility error. Per the task brief, when createBrowserRouter
// causes issues in jsdom, we test LoginScreen directly (already the primary
// auth entry point) rather than render the full browser router.
it("renders login screen without crashing", () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    </MemoryRouter>
  );
  expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
});
