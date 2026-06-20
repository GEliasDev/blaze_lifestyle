import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ id: "e1", category: "Lunch", eatenAt: "2026-06-15T13:00:00.000Z", hasSymptoms: false, clientCompliance: "yes", coachCompliance: null, photos: [], comments: [{ id: "c1", body: "Bien hecho", createdAt: "2026-06-15T14:00:00.000Z" }] }),
    blobUrl: vi.fn().mockResolvedValue("blob:x"), del: vi.fn(),
  },
}));
import { EntryDetailScreen } from "./EntryDetailScreen.jsx";

it("shows the entry and coach comment", async () => {
  render(<MemoryRouter initialEntries={["/entry/e1"]}><Routes><Route path="/entry/:id" element={<EntryDetailScreen />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/almuerzo/i)).toBeInTheDocument());
  expect(screen.getByText(/bien hecho/i)).toBeInTheDocument();
});
