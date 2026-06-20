import { render, screen } from "@testing-library/react";
import { ComplianceBadge } from "./ComplianceBadge.jsx";
import "../lib/i18n.js";

it("shows a labeled compliance badge", () => {
  render(<ComplianceBadge value="yes" />);
  expect(screen.getByText(/sí/i)).toBeInTheDocument();
});
