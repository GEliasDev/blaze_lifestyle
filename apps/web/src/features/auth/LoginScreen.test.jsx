import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../lib/auth.jsx";
import { LoginScreen } from "./LoginScreen.jsx";
import "../../lib/i18n.js";

it("renders email, password fields and a login button", () => {
  render(
    <MemoryRouter><AuthProvider><LoginScreen /></AuthProvider></MemoryRouter>
  );
  expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
});
