# Blaze Lifestyle — Nutrition Module Design Spec

**Date:** 2026-06-19
**Status:** Approved for planning
**Scope of this spec:** Foundation + Nutrition module (client app) + Coach panel for Nutrition only.

---

## 1. Overview

Blaze Lifestyle is a lifestyle-coaching platform. This spec covers the **first deliverable**: a
foundation plus a complete **Nutrition tracking module** with two sides:

- **Coach assigns the meal plan** — the coach defines what each client should eat (a per-client
  **meal guide**). The client logs meals as **photo evidence** that they ate the assigned meal.
- **Client app** — mobile-first PWA where a coached client sees their assigned plan and logs meals
  (photos, time, category, the plan item being fulfilled, self-reported compliance, digestive
  symptoms) on a daily timeline.
- **Coach panel** — responsive (mobile + desktop) view where the single coach manages clients,
  assigns/edits their meal plan, reviews each client's nutrition timeline, **confirms compliance**
  against the photo evidence, leaves feedback, and sees per-client metrics.

### Core loop
Coach assigns plan → client sees today's assigned meals → client logs each meal with photo evidence
and self-reports whether it complied → coach reviews the photo and **confirms or corrects**
compliance → metrics roll up per client.

Future modules (Exercise, Sleep, Body Composition) are **out of scope** here but the architecture is
designed so they slot in as sibling modules without rework.

### Onboarding (updated 2026-06-20 — open registration with coach codes)
- **Open self-registration:** anyone registers as `client` or `coach` (`POST /api/auth/register`,
  auto-login). The email-invitation flow and the single-coach seeder are **removed**.
- A **coach** gets a generated, unique, human-shareable **coach code** at registration; it is shown
  then and is always visible/copyable in the coach panel.
- A **client** links to a coach by entering that code — optionally at registration, or later in the
  client settings screen. **One coach, fixed:** once linked, a client cannot self-relink (entering a
  code while already linked → 409).

### Non-goals (explicitly deferred)
- Exercise, Sleep, Body Composition modules.
- Super-admin role / coach-of-coaches.
- Client self-service coach switching (linking is one-time; changing requires manual intervention).
- Registration rate-limiting / abuse protection (noted as future hardening).
- Two-way chat (coach feedback is one-way: coach comments, client reads).
- Offline write support (PWA is installable + cached shell; logging requires connectivity for v1).

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| Language | **JavaScript (ESM) — no TypeScript** (`.js` / `.jsx`) |
| Frontend | React + Vite + Tailwind CSS |
| Routing | React Router (role-based route trees) |
| i18n | Bilingual ES/EN (react-i18next), per-user `locale` |
| PWA | Installable (manifest + service worker, app-shell caching) |
| API | Node + Express |
| ORM | Sequelize over PostgreSQL |
| Validation | Zod (request/response schemas) |
| Auth | JWT (access + refresh); open self-registration (client/coach); client→coach link via coach code |
| Photo storage | Cloudflare R2 (S3-compatible); thumbnails generated with `sharp` |
| Monorepo | npm/pnpm workspaces: `apps/web`, `apps/api`, `packages/shared` |

---

## 3. Repository Structure

```
blaze_lifestyle/
├── apps/
│   ├── web/                      # React + Vite (client app + coach panel, one frontend)
│   │   ├── src/
│   │   │   ├── app/              # router, providers, role-based route trees
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── nutrition/    # client nutrition module (timeline, entry form, detail)
│   │   │   │   └── coach/        # coach panel (clients list, client detail, metrics)
│   │   │   ├── components/       # design-system primitives (Button, Select, Header, EntryCard…)
│   │   │   ├── lib/              # api client, auth, i18n, hooks
│   │   │   └── styles/           # tailwind config, tokens
│   │   └── public/               # PWA manifest, icons
│   └── api/                      # Express + PostgreSQL
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/         # auth.model · auth.schema · auth.service · auth.controller · auth.route
│       │   │   ├── users/
│       │   │   ├── coaching/     # coach↔client relations (via coach code), comments, compliance, metrics
│       │   │   ├── mealplans/    # meal plans + plan items (assigned by coach)
│       │   │   └── nutrition/    # meal entries + photos (evidence)
│       │   ├── middleware/       # auth guard, role guard, error handler, validation
│       │   ├── lib/              # db (sequelize), storage (R2 + sharp), config, coachCode generator
│       │   └── server.ts
│       └── tests/
├── packages/
│   └── shared/                   # shared enums/constants (categories) + Zod schemas
└── docs/
    └── superpowers/specs/
```

### Backend module layering (every module follows this pattern)
```
modules/<name>/
├── <name>.model.js        # Sequelize model → PostgreSQL table
├── <name>.schema.js       # Zod schemas for input/output validation
├── <name>.service.js      # business logic (no req/res here)
├── <name>.controller.js   # request handlers (parse → call service → respond)
└── <name>.route.js        # Express router wiring + middleware
```

---

## 4. Data Model (PostgreSQL via Sequelize)

```
users
  id            uuid pk
  role          enum('client','coach')
  email         text unique
  password_hash text
  name          text
  coach_code    text unique null     # set for coaches only; clients enter it to link
  locale        enum('es','en') default 'es'
  active        boolean default true
  created_at    timestamptz
  updated_at    timestamptz

coach_clients                       # coach↔client relationship (coach has N clients; client has ≤1 coach)
  id            uuid pk
  coach_id      uuid fk → users.id
  client_id     uuid fk → users.id   # unique → a client links to at most one coach
  created_at    timestamptz
  unique(coach_id, client_id), unique(client_id)

# (the `invitations` table is removed — onboarding is open registration + coach code)

meal_plans                          # one active plan per client (history kept)
  id            uuid pk
  coach_id      uuid fk → users.id
  client_id     uuid fk → users.id
  name          text                 # e.g. "Plan junio"
  start_date    date
  active        boolean default true # only one active=true per client
  created_at    timestamptz
  updated_at    timestamptz

meal_plan_items                     # supports BOTH weekly-recurring and date-specific scheduling
  id            uuid pk
  plan_id       uuid fk → meal_plans.id (on delete cascade)
  category      enum('Breakfast','AM Snack','Lunch','PM Snack','Dinner','Supplement')
  title         text                 # assigned meal, e.g. "Avena con fruta y nueces"
  notes         text null            # coach instructions / portions
  day_of_week   smallint null        # 0=Sun..6=Sat  → weekly recurring item
  specific_date date null            # → date-specific item (overrides weekday for that date)
  created_at    timestamptz
  # exactly one of (day_of_week, specific_date) is set; date-specific overrides weekly per (date,category)

meal_entries
  id                    uuid pk
  client_id             uuid fk → users.id
  plan_item_id          uuid fk → meal_plan_items.id null  # the assigned meal this evidences (null = off-plan)
  category              enum('Breakfast','AM Snack','Lunch','PM Snack','Dinner','Supplement')
  description           text null
  eaten_at              timestamptz          # date + time of the meal
  has_symptoms          boolean default false
  symptom_description   text null
  client_compliance     enum('yes','no','na') default 'na'   # self-reported by client
  coach_compliance      enum('yes','no') null                # coach confirmation/correction
  coach_compliance_at   timestamptz null
  created_at            timestamptz
  updated_at            timestamptz

meal_photos
  id            uuid pk
  entry_id      uuid fk → meal_entries.id (on delete cascade)
  storage_key   text                 # R2 object key (full-size)
  thumb_key     text                 # R2 object key (thumbnail)
  position      int                  # order in the gallery
  created_at    timestamptz

coach_comments
  id                uuid pk
  entry_id          uuid fk → meal_entries.id (on delete cascade)
  coach_id          uuid fk → users.id
  body              text
  created_at        timestamptz
  read_by_client_at timestamptz null  # set when the client opens the entry
```

**Notes**
- Photos live in R2; Postgres stores only keys. Deleting an entry **hard-deletes** the row, its
  `meal_photos`, and the underlying R2 objects (full + thumb).
- **Effective compliance** for metrics = `coach_compliance` when the coach has confirmed, otherwise
  the client's `client_compliance`. Off-plan entries (`plan_item_id` null) count as `na`.
- **Resolving today's assigned meals:** for a given client + date, take the client's active plan and,
  per category, use the `specific_date` item if one exists for that date, else the `day_of_week`
  item matching the date's weekday. This is the list the client logs evidence against.
- Metrics (compliance %, days-with-symptoms, logging streak) are **computed on read** via queries,
  not stored.
- **Coach code** is generated at coach registration: a short, unique, human-shareable string (6 chars
  from an unambiguous alphabet, no O/0/I/1), regenerated on collision. Stored on `users.coach_code`
  and returned in the user payload so the coach panel can display it.

---

## 5. API Surface (REST)

All routes under `/api`. Auth via `Authorization: Bearer <accessToken>`. Role guards enforce that a
client can only touch their own data and a coach only their own clients' data.

### Auth (`/api/auth`)
- `POST /register` → `{ name, email, password, role, coachCode? }` → creates user, auto-logs in,
  returns `{ accessToken, refreshToken, user }`. Coach: generates + returns `coachCode` in `user`.
  Client with a valid `coachCode`: links to that coach; invalid code → 400; no code → unlinked client.
- `POST /login` → `{ accessToken, refreshToken, user }`
- `POST /refresh` → new access token
- `POST /logout`

### Client — coach link (`/api/me/...`, role: client)
- `GET  /coach` → the client's linked coach `{ id, name }` or `null`
- `POST /coach` → `{ coachCode }` link to a coach; **409 if already linked** (one-time); invalid → 404

### Coach — clients (`/api/coach/...`, role: coach)
- `GET    /clients` → list of the coach's clients (with summary badges)
- `GET    /clients/:clientId` → client profile + nutrition metrics summary
- `GET    /clients/:clientId/entries` → that client's meal entries (supports filters, see below)
- `GET    /clients/:clientId/entries/:entryId` → entry detail + photos + comments
- `POST   /entries/:entryId/comments` → `{ body }` leave feedback on an entry
- `PATCH  /entries/:entryId/compliance` → `{ coach_compliance: 'yes'|'no' }` confirm/correct compliance

### Coach — meal plans (`/api/coach/...`, role: coach)
- `GET    /clients/:clientId/plan` → client's active plan + items (weekly grid + date overrides)
- `POST   /clients/:clientId/plan` → create a new active plan (deactivates the previous one)
- `PATCH  /plans/:planId` → rename / set start_date / activate
- `POST   /plans/:planId/items` → add item `{ category, title, notes, day_of_week | specific_date }`
- `PATCH  /plan-items/:itemId` → edit an item
- `DELETE /plan-items/:itemId` → remove an item

### Client — nutrition (`/api/me/...`, role: client)
- `GET    /me/plan` → own active plan (weekly grid + date overrides), read-only
- `GET    /me/plan/today?date=YYYY-MM-DD` → resolved assigned meals for that date (per category)
- `GET    /me/entries` → own entries (filters: category, hasSymptoms, date, compliance)
- `POST   /me/entries` → create entry (multipart: fields + 1..n photos)
- `GET    /me/entries/:id` → detail + photos + coach comments (marks comments read)
- `PATCH  /me/entries/:id` → edit fields and/or add/remove photos
- `DELETE /me/entries/:id` → hard delete (removes R2 objects)
- `GET    /me/profile` / `PATCH /me/profile` → name, locale

**Filters** (shared query contract, validated by Zod): `category`, `symptoms` (bool),
`date` (YYYY-MM-DD), `mealGuideCompliance` (yes|no|na).

**Photo upload flow:** multipart → Express (`multer` memory storage) → `sharp` makes a thumbnail →
both originals + thumbs streamed to R2 → keys saved in `meal_photos`. R2 objects are private; reads
go through an authenticated, ownership-checked proxy endpoint `GET /api/photos/:key`.

---

## 6. Frontend Design System ("Blaze")

Brand carried over from the provided mockup, refined with ui-ux-pro-max guidance (athletic / flat /
touch-first). Implemented as **Tailwind theme tokens + CSS variables**, not inline styles.

### Tokens
| Role | Value | Token |
|------|-------|-------|
| Brand / CTA | `#FF3C00` (Blaze orange-red) | `--color-primary` |
| Top bar / ink | `#000000` | `--color-ink` |
| Surface | `#FFFFFF` | `--color-surface` |
| Muted surface | `#F3F4F6` | `--color-muted` |
| Border | `#E5E7EB` (2px) | `--color-border` |
| Success (compliance yes) | `#22C55E` | `--color-success` |
| Danger (compliance no / symptoms) | `#EF4444` | `--color-danger` |

### Typography
- **Headings:** Barlow Condensed (600/700), UPPERCASE, `tracking-wide` — athletic/brutalist feel.
- **Body:** Barlow (400/500).
- Loaded via `@fontsource` with `font-display: swap`; fallback `system-ui` (matches the mockup if
  fonts fail). *This upgrades the mockup's `system-ui` headings — confirmed as an enhancement.*

### Style rules (brutalist / flat)
- 2px solid borders, **square corners** (`rounded-none`), **no shadows** (flat color-blocking).
- Press feedback: `scale-0.97`, 150ms, `ease-out`; respect `prefers-reduced-motion`.
- Icons: Lucide (SVG only — no emoji), consistent 24px sizing, stroke 2.
- State color is never the only signal: compliance/symptoms always pair color + icon + text.

### Responsive behavior
- **Client app:** mobile-first. On desktop, a **centered max-width column** (~430px) — *not* a fake
  phone frame. Bottom nav (≤5 items) on mobile.
- **Coach panel:** mobile = stacked navigation; desktop (≥1024px) = **master–detail** (clients list
  sidebar + selected client's timeline/metrics).
- Breakpoints: 375 / 768 / 1024 / 1440. Touch targets ≥44px. Long timelines virtualized.

---

## 7. Screens in Scope

### Client (mobile-first)
1. **Register / Login** — registration chooses role (client/coach); a client may enter a coach code
   (optional). **Settings** — shows the linked coach, or a field to enter a coach code to link (one-time).
2. **Timeline (home)** — entries grouped by day, sticky date dividers, filter bar (category,
   symptoms-only, compliance, date), symptom + compliance badges, empty state.
3. **My plan** — read-only view of the assigned meal guide: a weekly grid (Mon–Sun × categories)
   with any date-specific overrides; highlights **today's assigned meals** and which are still
   un-logged.
4. **New entry** — starts from an assigned plan item ("log evidence for *Breakfast: oatmeal*") or
   off-plan; photos (camera capture, multi), time, category (prefilled from the plan item),
   self-reported compliance, description, **and symptoms** (added vs. mockup, which only captured
   symptoms on edit). Save disabled until ≥1 photo + category. Inline validation.
5. **Entry detail** — photo gallery, meal time, category, the assigned item it evidences,
   compliance (own + coach's confirmation), digestive status, **coach comments** (marked read on open).
6. **Edit entry** — same fields; add/remove photos; delete entry (confirm dialog).

### Coach — meal plan
- **Assign / edit plan** — weekly grid editor (per weekday × category) plus date-specific overrides;
  each item has title + notes. Creating a new plan deactivates the previous one (history kept).

### Coach (responsive)
1. **Register / Login.**
2. **Clients list** — each client with summary badges (streak, recent symptoms, compliance); the
   coach's **shareable code** is shown/copyable here (replaces the old invite-by-email action).
3. **Client detail** — that client's nutrition timeline (same filters) + access to their meal plan.
4. **Assign/edit meal plan** — weekly grid + date overrides editor (see "Coach — meal plan" above).
5. **Entry detail** — view entry + photo evidence + **add comment** + **confirm/correct compliance**.
6. **Metrics summary** — compliance %, days-with-symptoms, logging streak for the selected client.

---

## 8. Auth & Roles Flow

1. Anyone **registers** (`POST /api/auth/register`) as `client` or `coach`; registration auto-logs in.
2. A **coach** receives a generated **coach code** (shown after registration, always visible in the panel).
3. A **client** links to a coach by entering the code — optionally at registration, or later in
   Settings (`POST /api/me/coach`). Linking is **one-time** (already-linked → 409); creates a
   `coach_clients` row (unique per client).
4. Login/register issue JWT access + refresh. Frontend stores tokens, loads the **role-based route tree**.
5. **Guards:** route middleware checks role; service layer checks ownership (client owns entry /
   coach owns client) on every data access.

---

## 9. Testing Strategy

- **API (integration, per module):** registration (coach code generated; client links with/without
  code; already-linked → 409), login, entry CRUD, **permission/ownership**
  (client cannot read another client; coach cannot read a non-client), photo upload (thumbnail
  created, R2 keys saved), filters, metrics computation. Run against a test PostgreSQL database.
- **Frontend (component + flow):** timeline grouping/filtering, entry form validation + photo
  add/remove, role-based routing, coach comment flow.
- **TDD** for business logic and guards (services, permission checks, metrics) — write the failing
  test first.

---

## 10. Build Phasing (within this spec)

1. **Foundation:** monorepo, `shared` package, Express skeleton (config, db, error/validation
   middleware, R2+sharp lib), auth module (open registration + coach codes), Vite app shell (router,
   i18n, PWA, design-system primitives).
2. **Meal plans:** coach assigns a plan (weekly grid + date overrides); client read-only plan view
   and "today's assigned meals" resolution.
3. **Nutrition — client:** meal entry CRUD + photos end-to-end, linked to plan items (the vertical
   slice).
4. **Coach panel — nutrition:** clients list (with shareable coach code), client timeline, comments,
   **compliance confirmation**, metrics.

Each step is test-backed before moving on.
