# Blaze Lifestyle

Lifestyle-coaching platform. Current deliverable: **Nutrition module** — a mobile-first PWA client
app for logging meals, plus a responsive coach panel for reviewing clients. Future modules
(Exercise, Sleep, Body Composition) are planned but out of current scope.

**Design spec:** [docs/superpowers/specs/2026-06-19-nutrition-module-design.md](docs/superpowers/specs/2026-06-19-nutrition-module-design.md)

## Stack

- **Language:** **JavaScript (ESM)** everywhere — no TypeScript. `"type": "module"`, `import`/`export`,
  `.js` for Node, `.jsx` for React components. Node ESM imports use explicit file extensions.
- **Frontend:** React + Vite + Tailwind CSS + React Router + react-i18next. PWA (installable).
- **Backend:** Node + Express, Sequelize ORM over **PostgreSQL**, Zod validation, JWT auth.
- **Security:** Helmet (HTTP headers), express-rate-limit (auth endpoints: 20 req/15min, general: 100 req/min).
- **Logging:** Pino structured logging with pino-http request logging.
- **Photos:** pluggable storage in `servidor/src/lib/storage.js` — **local disk** (`servidor/uploads/`, gitignored) when `R2_ENDPOINT` is empty (dev default), **Cloudflare R2** (S3-compatible) when configured. Same interface either way; thumbnails via `sharp`; served through an authenticated proxy (`GET /api/photos/:key`). Up to `MAX_PHOTOS = 5` per entry (`servidor/src/modules/nutrition/nutrition.schema.js`, shared by the multer limit and the service's over-limit check). The client re-encodes photos before upload (`cliente/src/lib/imageCompress.js` — canvas resize to ≤1920px + JPEG ~0.85 quality, lossless no-op if it wouldn't shrink the file) to keep uploads fast without a visible quality hit.
- **LAN/phone dev:** web api base derives from `window.location.hostname:4000`; Vite `server.host=true`; API CORS reflects request origin in dev. Open `http://<PC-LAN-IP>:5173` on the phone.
- **Two standalone projects** (no monorepo): `cliente/` (frontend) and `servidor/` (backend), each
  with its own `package.json` and `node_modules` — run `npm install` / `npm run dev` inside each.
  Shared enums/constants + Zod schemas live in `servidor/src/shared/` (the client keeps its own copies).

## Backend conventions

- Organize the API by **modules** under `servidor/src/modules/<name>/`. Every module follows this layering:
  - `<name>.model.js` — Sequelize model (maps to a PostgreSQL table)
  - `<name>.schema.js` — Zod schemas (validate request input + response shape)
  - `<name>.service.js` — business logic only; **no `req`/`res`** here
  - `<name>.controller.js` — request handlers: parse → call service → respond
  - `<name>.route.js` — Express router + middleware wiring
- Controllers stay thin; put logic in services. Services are unit-testable without HTTP.
- **Authorization is enforced in two places:** route-level role guard (`client`/`coach`) AND
  service-level ownership check (client owns the entry / coach owns the client) on every data access.
- Validate all input with Zod at the controller boundary before touching services.
- **Rate limiting:** auth endpoints (login/register) limited to 20 requests per 15 minutes per IP.
- **Logging:** use `logger` from `servidor/src/lib/logger.js` (Pino) instead of `console.log/error`.

## Frontend conventions

- Feature-first folders under `cliente/src/features/` (`auth`, `nutrition`, `coach`, `account`).
- Reusable design-system primitives live in `cliente/src/components/`. Do not re-inline mockup markup.
- **One frontend, two roles.** After login, the user's `role` selects the route tree and layout.
  - Client = mobile-first; on desktop a centered ~430px column (no fake phone frame).
  - Coach = responsive; desktop ≥1024px uses master–detail (clients sidebar + content).
- **Error handling:** `ErrorBoundary` wraps the entire app; components use try/catch with user-facing error states.
- **Loading states:** Use `Spinner` for inline loading, `ListSkeleton`/`EntrySkeleton` for content placeholders.

## Design system ("Blaze")

Tokens via Tailwind theme + CSS variables — never hardcode hex in components.

- **Colors:** primary/CTA `#FF3C00`, ink/top-bar `#000`, success `#22C55E`, danger `#EF4444`.
- **Type:** headings Barlow Condensed (UPPERCASE, tracking-wide); body Barlow; fallback `system-ui`.
- **Style:** brutalist/flat — 2px borders, square corners (`rounded-none`), **no shadows**.
- Press feedback `scale-0.97` 150ms ease-out; respect `prefers-reduced-motion`.
- Icons: **Lucide only (SVG), no emoji.** State (compliance/symptoms) = color + icon + text, never color alone.
- Touch targets ≥44px. Virtualize long timelines.

## Language — English only

**Every user-facing string written from now on must be in English.** The app runs
react-i18next (`cliente/src/lib/i18n.js`) with both `es.json` and `en.json` resources, but
`lng` is hardcoded to `"en"` and there is no language switcher in the UI — Spanish is
effectively dormant. Keep writing new copy through `t("...")` keys as before (do not
hardcode strings in JSX), but **add the English value only**; don't maintain the `es.json`
mirror going forward. Also applies to anything not routed through i18next: class components
that can't use the `useTranslation` hook should import the shared instance directly
(`import i18n from "../lib/i18n.js"; i18n.t("...")`) rather than hardcoding text — see
`ErrorBoundary.jsx`. Date/time formatting that reads `i18n.language` (e.g. weekday/month
names via `toLocaleDateString`) is English by the same switch, no separate handling needed.

## Domain rules

- Meal categories: `Breakfast`, `AM Snack`, `Lunch`, `PM Snack`, `Dinner`, `Supplement`.
- **Current implementation is free-form logging**, not the plan-based flow described in the
  design spec (meal plan / `plan_item_id` / coach-set compliance below are the planned
  direction — **not yet built**). Today: `POST /api/me/entries` takes `category` (required —
  the only required field, enforced by the Zod schema), `eatenAt`, an optional `compliance`
  (`yes`/`no`), an optional `description`, and 0–`MAX_PHOTOS` photos directly from the client.
  The client-side form only hard-requires category; date/time default to now and can be left
  as-is, and Meal Guide compliance has no default selection (blank until chosen) but isn't
  required to submit — omit it and the server stores the legacy default `na`.
- *(Planned, not implemented)* **Meal plan:** the coach assigns each client a meal plan; the
  client logs meals as **photo evidence** of eating the assigned meal. One active plan per
  client (history kept). Plan items support **both** weekly-recurring (`day_of_week`) **and**
  date-specific (`specific_date`) scheduling; date-specific overrides the weekday for that date.
  Client sends only `plan_item_id` + photos; server derives `category` from the plan item.
- *(Planned, not implemented)* **Compliance is coach-only:** the coach sets `coach_compliance`
  (yes/no) when reviewing the photo; null = pending review. Metrics: `compliancePct` over
  reviewed entries + a `pendingReview` count.
- Symptoms: boolean + optional description.
- **Entries list windowing:** `GET /entries` (client + coach) accepts optional `from`/`to` (ISO
  datetimes) and `limit` query params (`nutrition.schema.js` → `listQuerySchema`), filtered at
  the DB level. The client (`NutritionScreen.jsx`) defaults to a rolling **last-30-days window**
  (not the full history) with a "Load more" button that extends it another 30 days — the button
  only renders after a cheap `limit:1` probe confirms older entries actually exist. Picking an
  explicit date-range filter bypasses the rolling window and queries that exact range instead.
  Within the list: most recent **day** first, but entries **within** a day are chronological
  (earliest meal on top — the order the client actually ate). List filters (category — multi-select,
  symptoms, Meal Guide compliant/non-compliant) apply client-side on top of whatever window is loaded.
- Onboarding is **open registration**: anyone registers as `client` or `coach` (`POST /api/auth/register`,
  auto-login). A coach gets a generated, unique **`coach_code`** (shown at registration + always in the
  coach panel). A client links to a coach by entering that code — optionally at registration or later in
  Settings (`POST /api/me/coach`); linking is **one-time** (already-linked → 409). No email invitations,
  no seeded coach. `users.coach_code` is set for coaches only and returned in the user payload.
- Coach feedback is **one-way**: coach comments on an entry; client reads (marked read on open).
- Deleting an entry **hard-deletes** the row, its photos, and the R2 objects.

## API Endpoints

### Auth (`/api/auth`)
- `POST /login` — rate limited (20/15min)
- `POST /register` — rate limited (20/15min)
- `POST /refresh` — refresh access token

### Client (`/api/me`)
- `GET /entries` — list client's meal entries; optional `from`/`to` (ISO datetime) + `limit` query params
- `POST /entries` — create entry (multipart: photos + JSON)
- `GET /entries/:id` — get entry detail
- `PATCH /entries/:id` — update entry (multipart)
- `DELETE /entries/:id` — hard-delete entry + photos
- `GET /coach` — get linked coach info
- `POST /coach` — link to coach (one-time)
- `GET /profile` — get user profile
- `PATCH /profile` — update name/email
- `POST /change-password` — change password (requires current password)

### Coach (`/api/coach`)
- `GET /clients` — list coach's clients
- `GET /clients/:clientId/metrics` — get client metrics (compliance %, symptom days, pending review)
- `GET /clients/:clientId/entries` — list client's entries; optional `from`/`to` (ISO datetime) + `limit` query params
- `POST /clients/:clientId/entries` — create entry for client
- `GET /clients/:clientId/entries/:id` — get entry detail
- `PATCH /clients/:clientId/entries/:id` — update entry
- `DELETE /clients/:clientId/entries/:id` — delete entry

### Photos (`/api/photos`)
- `GET /:prefix/:file` — authenticated photo proxy

## Frontend Components

### Design System (`cliente/src/components/`)
- `Button.jsx` — primary/secondary variants, brutalist style
- `AppHeader.jsx` — top bar; sticky, hamburger nav on mobile, plain title bar on desktop.
  Text-based "BLAZE LIFESTYLE" branding, not the logo image (kept out of the compact bars).
- `Spinner.jsx` — loading indicator with animation
- `Skeleton.jsx` — content placeholder (EntrySkeleton, ListSkeleton)
- `ErrorBoundary.jsx` — catch-all error handler (class component — uses the `i18n` instance
  directly instead of the `useTranslation` hook; see the Language section above)
- `AuthImage.jsx` — authenticated photo loader
- `PhotoCarousel.jsx` — scroll-snap photo slider with prev/next arrow buttons (mouse-friendly,
  dragging alone isn't enough on desktop) + dot pagination; lightbox supports arrow-key nav.
  Inline (non-lightbox) view is `aspect-[4/5] object-contain` and width-capped
  (`max-w-md`/`lg:max-w-lg`) so photos don't stretch edge-to-edge and pixelate on wide desktop panes.
- `ClientSidebar.jsx` — desktop module navigation, shows the full logo (`/logo-full.webp`)

### `cliente/src/lib/`
- `imageCompress.js` — client-side photo downscale/re-encode before upload (see Photos above)
- `i18n.js` — react-i18next setup; `lng` fixed to `"en"` (see Language section above)

### Features
- `auth/` — LoginScreen (shows `/logo-white.webp`), RegisterScreen (shows `/logo-full.webp`)
- `nutrition/` — NutritionLayout, NutritionScreen, AddMealScreen, EntryDetailScreen, EditEntryScreen
  - `NutritionLayout.jsx`: desktop master–detail split with a **draggable resize handle** between
    the list and detail panes (280–600px, persisted to `localStorage`, keyboard-adjustable).
    Root uses `h-dvh` (not `min-h-dvh`) so the header/list/footer containment is exact — this is
    what makes the sticky header and sticky bottom action bars actually stay put instead of
    scrolling away with the page on mobile.
- `coach/` — CoachLayout, CoachClientLayout, CoachClientHome, ClientsScreen
- `account/` — SettingsScreen (coach link, profile, password)
- `modules/` — ModulePlaceholder (future modules)

## PWA / branding assets (`cliente/public/`)
- `icon-192.png` / `icon-512.png` — home-screen install icons. **Kept as PNG on purpose** (not
  WebP) — `apple-touch-icon` support for WebP on iOS is unreliable.
- `logo-full.webp`, `logo-white.webp` — the two in-app logo images (full black-bg logo; white-bg
  variant with a transparent background, flood-filled so it matches any page background exactly).
  Converted to WebP **lossless** (pixel-identical to the source PNGs, ~50–70% smaller).
- `manifest.webmanifest` — `name`/`short_name` both "Blaze Lifestyle" (no truncated short name);
  `theme_color`/`background_color` intentionally **not** the brand orange (see `index.html`'s
  `<meta name="theme-color">`, currently white) so the mobile browser chrome doesn't tint orange.
- `index.html` also sets `apple-mobile-web-app-title` + `apple-mobile-web-app-capable` — iOS
  reads its own meta tags for "Add to Home Screen" naming/standalone mode, not just the manifest.

## Deployment
- Self-hosted via **Coolify** (see the `ARG VITE_API_URL` comment in `cliente/Dockerfile` —
  Vite bakes env vars in at build time, so `VITE_API_URL` must be set as a Coolify build arg and
  the frontend redeployed whenever the backend URL changes, not just updated as a runtime env var).
- Production domain: `blazelifestyle.fit` (frontend) / `api.blazelifestyle.fit` (backend), both as
  A records at the DNS registrar (GoDaddy) pointing at the server IP; Coolify handles the reverse
  proxy + Let's Encrypt SSL per-domain once DNS resolves.
- CORS (`servidor/src/app.js`) reflects any request origin (`origin: true`) — no per-environment
  origin allowlist to maintain when domains change.
- **Module flags / superuser panel:** one backend + one database serves local dev, the preview
  deploy, and production, so `servidor/src/modules/admin/` scopes each module's on/off flag by
  `environment` (`local`/`preview`/`production` — `APP_ENVIRONMENTS` in `servidor/src/shared/enums.js`)
  instead of one shared switch for all three. The client reports its own environment via
  `VITE_APP_ENV` (`cliente/src/lib/env.js`) — like `VITE_API_URL`, it's a **build arg**, not a
  runtime env var, so it must be set per Coolify app and the frontend redeployed for changes to
  take effect. Local dev needs nothing set (defaults to `"local"` automatically); the **preview**
  Coolify app must explicitly set `VITE_APP_ENV=preview`, or it silently falls back to
  `"production"` and shares production's flags. A superuser account (`SUPERUSER_EMAIL`/
  `SUPERUSER_PASSWORD` in the backend's env vars — not a DB row) manages all three environments'
  flags from one `/admin` screen via an environment picker, independent of which deployed frontend
  they happen to log into.

## Testing

- TDD for services, permission/ownership guards, and metric computations.
- API: integration tests per module against a test PostgreSQL DB (include permission tests).
- Frontend: component + flow tests (timeline grouping/filters, entry form, role routing, comments).
