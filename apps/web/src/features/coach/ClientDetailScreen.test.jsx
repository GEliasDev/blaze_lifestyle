import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({
  api: {
    get: vi.fn((p) => p.endsWith("/entries")
      ? Promise.resolve([{ id: "e1", category: "Breakfast", eatenAt: "2026-06-15T08:00:00.000Z", hasSymptoms: false, clientCompliance: "yes", coachCompliance: null, photos: [] }])
      : Promise.resolve({ id: "u1", name: "Ana", email: "ana@x.com", metrics: { totalEntries: 1, compliancePct: null, symptomDays: 0 } })),
    blobUrl: vi.fn().mockResolvedValue("blob:x"),
  },
}));
import { ClientDetailScreen } from "./ClientDetailScreen.jsx";

it("shows client name and metrics", async () => {
  render(<MemoryRouter initialEntries={["/coach/clients/u1"]}><Routes><Route path="/coach/clients/:id" element={<ClientDetailScreen />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByText("Ana")).toBeInTheDocument());
});
