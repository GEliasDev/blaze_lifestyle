import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../lib/auth.jsx";
import { RegisterScreen } from "./RegisterScreen.jsx";
import "../../lib/i18n.js";

it("renders the register form with role options", () => {
  render(<MemoryRouter><AuthProvider><RegisterScreen /></AuthProvider></MemoryRouter>);
  expect(screen.getByRole("button", { name: /registrarme/i })).toBeInTheDocument();
  expect(screen.getByText(/cliente/i)).toBeInTheDocument();
  expect(screen.getByText(/coach/i)).toBeInTheDocument();
});
