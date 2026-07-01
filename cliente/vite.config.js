import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ registerType: "autoUpdate", manifest: false, includeAssets: ["icon-192.png", "icon-512.png"] }),
  ],
  // host: true exposes the dev server on the LAN (0.0.0.0) and prints a
  // "Network" URL you can open from your phone.
  server: { host: true },
});
