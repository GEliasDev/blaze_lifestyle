import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // "prompt" (not "autoUpdate") + injectRegister: null — registration is
    // done by hand via virtual:pwa-register (see lib/swUpdate.js), so a new
    // version surfaces as a dismissible banner (UpdateBanner.jsx) instead of
    // silently reloading a page out from under someone mid-task.
    VitePWA({ registerType: "prompt", injectRegister: null, manifest: false, includeAssets: ["icon-192.png", "icon-512.png"] }),
  ],
  // host: true exposes the dev server on the LAN (0.0.0.0) and prints a
  // "Network" URL you can open from your phone.
  server: { host: true },
});
