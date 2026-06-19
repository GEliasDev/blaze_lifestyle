import { render, screen } from "@testing-library/react";
import { Button } from "./Button.jsx";

it("renders a primary button with min touch height", () => {
  render(<Button variant="primary">GUARDAR</Button>);
  const btn = screen.getByRole("button", { name: "GUARDAR" });
  expect(btn).toHaveClass("min-h-[44px]");
});
