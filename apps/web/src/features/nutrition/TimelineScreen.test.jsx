import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";

vi.mock("../../lib/api.js", () => ({
  api: {
    get: vi.fn().mockResolvedValue([
      { id: "e1", category: "Breakfast", description: "Avena", eatenAt: "2026-06-15T08:00:00.000Z", hasSymptoms: false, clientCompliance: "yes", coachCompliance: null, photos: [{ thumbKey: "thumbs/a.jpg" }] },
    ]),
    blobUrl: vi.fn().mockResolvedValue("blob:x"),
  },
}));

import { TimelineScreen } from "./TimelineScreen.jsx";

it("renders entries from the API", async () => {
  render(<MemoryRouter><TimelineScreen /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/desayuno/i)).toBeInTheDocument());
});
