import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({
  api: { get: vi.fn().mockResolvedValue({ plan: { id: "p1", name: "Plan Jun" }, items: [{ id: "i1", category: "Breakfast", title: "Avena", dayOfWeek: 1 }] }), post: vi.fn(), del: vi.fn() },
}));
import { PlanEditorScreen } from "./PlanEditorScreen.jsx";

it("shows existing plan items", async () => {
  render(<MemoryRouter initialEntries={["/coach/clients/u1/plan"]}><Routes><Route path="/coach/clients/:id/plan" element={<PlanEditorScreen />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByText("Avena")).toBeInTheDocument());
});
