// Which of the three shared-backend fronts this build is — see
// servidor/src/shared/enums.js (APP_ENVIRONMENTS) for why this exists.
// Local dev needs nothing set (import.meta.env.DEV is true under `npm run
// dev`); the preview and production Coolify apps must each set
// VITE_APP_ENV as a build arg (same convention as VITE_API_URL) or they'll
// both silently fall back to "production" and share its module flags.
export const APP_ENV = import.meta.env.VITE_APP_ENV || (import.meta.env.DEV ? "local" : "production");
