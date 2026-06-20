import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({
  api: { get: vi.fn().mockResolvedValue([{ id: "u1", name: "Ana", email: "ana@x.com", totalEntries: 3 }]), post: vi.fn() },
}));
import { ClientsScreen } from "./ClientsScreen.jsx";

it("lists clients from the API", async () => {
  render(<MemoryRouter><ClientsScreen /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText("Ana")).toBeInTheDocument());
});
