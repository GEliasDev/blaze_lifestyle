import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({ api: { postForm: vi.fn().mockResolvedValue({ id: "x" }) } }));
import { AddEntryScreen } from "./AddEntryScreen.jsx";

it("renders the new-entry form with a disabled save until valid", () => {
  render(<MemoryRouter><AddEntryScreen /></MemoryRouter>);
  expect(screen.getByText(/nueva entrada/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /guardar entrada/i })).toBeDisabled();
});
