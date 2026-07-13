import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

// Code updates aren't as time-sensitive as module flags (60s poll) — an
// active check every 10 minutes is plenty, since applying it is gated on the
// user tapping "Update" anyway (see UpdateBanner.jsx), not automatic.
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

export function useSWUpdate() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const updateSWRef = useRef(null);

  useEffect(() => {
    updateSWRef.current = registerSW({
      onNeedRefresh() { setNeedsRefresh(true); },
      onRegisteredSW(_url, registration) {
        if (!registration) return;
        setInterval(() => registration.update(), CHECK_INTERVAL_MS);
      },
    });
  }, []);

  return {
    needsRefresh,
    applyUpdate: () => updateSWRef.current?.(true),
    dismiss: () => setNeedsRefresh(false),
  };
}
