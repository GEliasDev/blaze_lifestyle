import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ registerType: "autoUpdate", manifest: false, includeAssets: ["icon-192.png", "icon-512.png"] }),
  ],
  test: { environment: "jsdom", globals: true, setupFiles: ["./src/test-setup.js"] },
});
