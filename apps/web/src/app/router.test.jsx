import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../lib/auth.jsx";
import { routes } from "./router.jsx";
import "../lib/i18n.js";

// Note: createMemoryRouter + RouterProvider triggers a fetch-based navigation
// that conflicts with Node 24's native AbortSignal in jsdom. We use MemoryRouter
// instead, which is the component-based API and has no such limitation.
// The route guards are exported from routes[] so their logic is still tested.
it("redirects an unauthenticated visitor from /home to /login", () => {
  localStorage.clear();
  // The /home route is protected by RequireRole role="client".
  // With no user in localStorage, RequireRole navigates to /login.
  // We simulate that directly: render RequireRole (via MemoryRouter at /home)
  // and verify the LoginScreen appears at /login.
  render(
    <MemoryRouter initialEntries={["/home"]}>
      <AuthProvider>
        <Routes>
          {routes.map((r, i) => (
            <Route key={i} path={r.path} element={r.element}>
              {r.children?.map((c, j) => (
                <Route key={j} path={c.path} element={c.element}>
                  {c.children?.map((gc, k) => (
                    <Route key={k} path={gc.path} element={gc.element} />
                  ))}
                </Route>
              ))}
            </Route>
          ))}
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
  expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
});
