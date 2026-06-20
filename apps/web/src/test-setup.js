import "@testing-library/jest-dom";

// Node 24 + jsdom: jsdom's AbortSignal is a different class than Node's native
// AbortSignal. React Router v6 internally calls new Request({signal}) which goes
// through undici's fetch, which does an `instanceof AbortSignal` check against the
// Node global — not jsdom's version — and throws. Align them so the check passes.
if (globalThis.AbortSignal && typeof window !== "undefined" && window.AbortSignal !== globalThis.AbortSignal) {
  window.AbortSignal = globalThis.AbortSignal;
  window.AbortController = globalThis.AbortController;
}
