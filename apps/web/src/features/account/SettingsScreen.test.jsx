import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({ api: { get: vi.fn().mockResolvedValue(null), post: vi.fn() } }));
import { SettingsScreen } from "./SettingsScreen.jsx";

it("shows the link-coach form when the client has no coach", async () => {
  render(<MemoryRouter><SettingsScreen /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole("button", { name: /vincular/i })).toBeInTheDocument());
});
