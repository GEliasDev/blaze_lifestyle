import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ id: "e1", category: "Breakfast", eatenAt: "2026-06-15T08:00:00.000Z", hasSymptoms: false, clientCompliance: "no", coachCompliance: null, photos: [], comments: [] }),
    blobUrl: vi.fn().mockResolvedValue("blob:x"), post: vi.fn(), patch: vi.fn(),
  },
}));
import { CoachEntryScreen } from "./CoachEntryScreen.jsx";

it("renders entry review with a comment box", async () => {
  render(<MemoryRouter initialEntries={["/coach/entries/e1?client=u1"]}><Routes><Route path="/coach/entries/:id" element={<CoachEntryScreen />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/desayuno/i)).toBeInTheDocument());
  expect(screen.getByRole("button", { name: /agregar comentario/i })).toBeInTheDocument();
});
