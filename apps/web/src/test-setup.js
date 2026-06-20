import "@testing-library/jest-dom";

// Node 24 + jsdom: jsdom's AbortSignal is a different class than Node's native
// AbortSignal. React Router v6 internally calls new Request({signal}) which goes
// through undici's fetch, which does an `instanceof AbortSignal` check against the
// Node global — not jsdom's version — and throws. Align them so the check passes.
if (globalThis.AbortSignal && typeof window !== "undefined" && window.AbortSignal !== globalThis.AbortSignal) {
  window.AbortSignal = globalThis.AbortSignal;
  window.AbortController = globalThis.AbortController;
}

// jsdom does not implement URL.createObjectURL / revokeObjectURL — stub them out
// so AuthImage and similar components don't throw during cleanup.
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "blob:stub";
}
if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = () => {};
}
