import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({ api: { postForm: vi.fn().mockResolvedValue({ id: "e1" }) } }));
import { EvidenceScreen } from "./EvidenceScreen.jsx";

it("renders the assigned meal and a disabled save until a photo is added", () => {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/evidence/i1", state: { category: "Breakfast", title: "Avena" } }]}>
      <Routes><Route path="/evidence/:itemId" element={<EvidenceScreen />} /></Routes>
    </MemoryRouter>
  );
  expect(screen.getByText("Avena")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /enviar evidencia/i })).toBeDisabled();
});
