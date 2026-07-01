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
- **Photos:** pluggable storage in `servidor/src/lib/storage.js` — **local disk** (`servidor/uploads/`, gitignored) when `R2_ENDPOINT` is empty (dev default), **Cloudflare R2** (S3-compatible) when configured. Same interface either way; thumbnails via `sharp`; served through an authenticated proxy (`GET /api/photos/:key`).
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

## Frontend conventions

- Feature-first folders under `cliente/src/features/` (`auth`, `nutrition`, `coach`).
- Reusable design-system primitives live in `cliente/src/components/`. Do not re-inline mockup markup.
- **One frontend, two roles.** After login, the user's `role` selects the route tree and layout.
  - Client = mobile-first; on desktop a centered ~430px column (no fake phone frame).
  - Coach = responsive; desktop ≥1024px uses master–detail (clients sidebar + content).

## Design system ("Blaze")

Tokens via Tailwind theme + CSS variables — never hardcode hex in components.

- **Colors:** primary/CTA `#FF3C00`, ink/top-bar `#000`, success `#22C55E`, danger `#EF4444`.
- **Type:** headings Barlow Condensed (UPPERCASE, tracking-wide); body Barlow; fallback `system-ui`.
- **Style:** brutalist/flat — 2px borders, square corners (`rounded-none`), **no shadows**.
- Press feedback `scale-0.97` 150ms ease-out; respect `prefers-reduced-motion`.
- Icons: **Lucide only (SVG), no emoji.** State (compliance/symptoms) = color + icon + text, never color alone.
- Touch targets ≥44px. Virtualize long timelines. i18n: every user-facing string goes through react-i18next (ES/EN).

## Domain rules

- Meal categories: `Breakfast`, `AM Snack`, `Lunch`, `PM Snack`, `Dinner`, `Supplement`.
- **Meal plan:** the coach assigns each client a meal plan; the client logs meals as **photo
  evidence** of eating the assigned meal. One active plan per client (history kept). Plan items
  support **both** weekly-recurring (`day_of_week`) **and** date-specific (`specific_date`)
  scheduling; date-specific overrides the weekday for that date.
- **Client logs evidence only** (refined 2026-06-20): from "My Plan" the client taps an assigned
  meal and uploads photo(s) as evidence. `POST /api/me/entries` requires `plan_item_id`; the server
  derives `category` from the plan item and verifies it belongs to the client's active plan. The
  client sends no category/description/compliance — only photos + optional symptoms.
- **Compliance is coach-only:** the coach sets `coach_compliance` (yes/no) when reviewing the photo;
  null = pending review. `client_compliance` is legacy (always `na`). Metrics: `compliancePct` over
  reviewed entries + a `pendingReview` count.
- Symptoms: boolean + optional description.
- Onboarding is **open registration**: anyone registers as `client` or `coach` (`POST /api/auth/register`,
  auto-login). A coach gets a generated, unique **`coach_code`** (shown at registration + always in the
  coach panel). A client links to a coach by entering that code — optionally at registration or later in
  Settings (`POST /api/me/coach`); linking is **one-time** (already-linked → 409). No email invitations,
  no seeded coach. `users.coach_code` is set for coaches only and returned in the user payload.
- Coach feedback is **one-way**: coach comments on an entry; client reads (marked read on open).
- Deleting an entry **hard-deletes** the row, its photos, and the R2 objects.

## Testing

- TDD for services, permission/ownership guards, and metric computations.
- API: integration tests per module against a test PostgreSQL DB (include permission tests).
- Frontend: component + flow tests (timeline grouping/filters, entry form, role routing, comments).
