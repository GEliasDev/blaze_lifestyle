# Blaze Lifestyle — Exercise Module Design Spec

**Date:** 2026-07-06
**Status:** Approved for planning
**Scope of this spec:** Exercise module — client app (Home/stats, Calendar, Add, Tags read-only,
entry detail/edit) + coach-side (per-client read-only Home/Calendar, global tag administration).

---

## 1. Overview

Second client module after Nutrition. The client logs workouts ("entries"): a free-text
description, optional biofeedback notes, 1+ tags (e.g. Weightlifting, Running, Yoga), and up to 5
photos as evidence. Unlike Nutrition, there is no coach-assigned plan here — the client freely logs
whatever they trained, tagged from a shared tag list.

**Design reference:** the user supplied a working React mockup ("MovementApp") of the intended UX —
Home (year/week training-consistency stats + a weekly bar chart), Calendar (month grid, tap a day to
see that day's entries), Add Entry (photos, tag picker, date/time, description, biofeedback), and a
Journal (flat chronological list). **Journal is explicitly dropped** — its slot in the bottom nav is
replaced by a **Tags** screen. The mockup's fake-phone-frame wrapper and its Tailwind visual style
(`rounded-xl`, `shadow-sm`, gray backgrounds) are **not** carried over — screens are rebuilt with
Blaze's actual design system (brutalist: 2px borders, `rounded-none`, no shadows, Barlow Condensed
uppercase headings, `AppHeader`/`Button`/`Spinner`/`Skeleton` primitives).

### Core decisions from brainstorming
- **Navigation:** Exercise gets its **own persistent bottom tab bar** (Home / Calendar / Tags / Add),
  distinct from Nutrition's plain header+list pattern. The app-level hamburger/sidebar nav (switching
  between Nutrition/Exercise/Sleep/Body Comp) is unchanged.
- **Tags are global, coach-administered.** A fixed set of 14 "system" tags (from the mockup) ship
  seeded and can never be deleted. A **coach** (any coach, not scoped to a specific client) creates
  additional custom tags and picks a color for each from a fixed palette. Clients see a **read-only**
  Tags screen (system + custom, with color swatches) — no create/delete UI for clients.
- **Tag deletion is blocked (409)** if the tag is currently used by any entry — protects history.
  System tags can never be deleted regardless of use.
- **Stats are computed, not hardcoded** (the mockup's "8/254" / "3/4" were static demo numbers):
  *year* = distinct trained days this year ÷ days elapsed this year; *week* = distinct trained days
  this week ÷ days elapsed in the current week (week starts Monday, matching the mockup's default).
  Computed **server-side** (a dedicated stats endpoint) rather than shipping the whole year of entries
  to the client, mirroring how Nutrition's coach metrics are computed server-side.
- **Coach gets a read-only view per client** (Home + Calendar only, same data, no Add/Tags button, no
  edit/delete) — mirrors the existing `useNutritionScope` `:clientId`-presence pattern.
- **Entries are editable/deletable** via a detail screen (tap an entry from Calendar), same as
  Nutrition's `EntryDetailScreen`/`EditEntryScreen` — the mockup itself has no such screen, but this
  keeps Exercise consistent with the rest of the app.
- **Photos:** same pipeline as Nutrition — up to `MAX_PHOTOS = 5`, client-side re-encode
  (`imageCompress.js`), `storage.js` (disk/R2), authenticated proxy `/api/photos/:key` (already
  storage-key-based, not module-specific — reused as-is, no changes needed).

### Non-goals (deferred)
- Editing/deleting tags' color after creation, reordering tags, per-client custom tags.
- Coach creating/editing/deleting a client's exercise entries (coach is read-only for entries).
- Changing week-start-day in the UI (hardcoded Monday, like the mockup's default).
- Sleep, Body Composition modules.

---

## 2. Data model (backend)

New module `servidor/src/modules/exercise/`, same layering as `nutrition/`
(`.model.js` / `.schema.js` / `.service.js` / `.controller.js` / `.route.js`).

**`exerciseEntry.model.js`** (table `exercise_entries`)
| field | type | notes |
|---|---|---|
| id | UUID PK | |
| clientId | UUID, not null | owner |
| exercisedAt | DATE, not null | combined date+time, client-supplied, defaults to now |
| description | TEXT, not null | required (mirrors mockup's save-button validation) |
| biofeedback | TEXT, nullable | optional free text |

**`exercisePhoto.model.js`** (table `exercise_photos`) — identical shape to `mealPhoto.model.js`:
`id`, `entryId`, `storageKey`, `thumbKey`, `position`.

**`exerciseTag.model.js`** (table `exercise_tags`)
| field | type | notes |
|---|---|---|
| id | UUID PK | |
| name | STRING, not null, unique | |
| color | STRING, not null | one of a fixed palette (Tailwind color-family keys, e.g. `blue`, `red`) |
| isSystem | BOOLEAN, default false | true for the 14 seeded tags; never deletable |

Seeded system tags (name → color), taken directly from the mockup's `tagColors`: Weightlifting→blue,
Olympic Weightlifting→purple, Crossfit→red, Running→green, Bicycle→yellow, Movement→orange,
Yoga→pink, Stretching→indigo, Swimming→cyan, Boxing→gray, Martial Arts→red (darker shade), Rock
Climbing→stone, Hiking→emerald, Injury→red (darkest shade). Seeding happens once via the existing
dev-bootstrap `sync()` path (insert-if-not-exists by `name`), no separate seed script needed.

**`exerciseEntryTag.model.js`** (table `exercise_entry_tags`) — pure join table: `entryId`, `tagId`.
Sequelize `belongsToMany` on both sides. Deleting an entry cascades to its join rows (and its
`exercisePhoto` rows + underlying storage objects, same as Nutrition's hard-delete).

---

## 3. API endpoints

### Client (`/api/me`)
- `GET /exercise-entries` — list own entries; optional `from`/`to` (ISO datetime) + `limit`, same
  contract as Nutrition's `listQuerySchema`.
- `POST /exercise-entries` — create (multipart: photos + JSON: `tagIds` (1+ required), `exercisedAt`
  optional, `description` required, `biofeedback` optional).
- `GET /exercise-entries/:id` — detail.
- `PATCH /exercise-entries/:id` — edit (multipart, same shape as Nutrition's edit).
- `DELETE /exercise-entries/:id` — hard-delete (entry + photos + storage objects).
- `GET /exercise-stats` — `{ yearTrainedDays, yearElapsedDays, weekTrainedDays, weekElapsedDays,
  weeklyChart: [{ week, days }] }` for the current year up to today.

### Coach (`/api/coach`) — read-only for a specific client
- `GET /clients/:clientId/exercise-entries` — list (same query params).
- `GET /clients/:clientId/exercise-entries/:id` — detail.
- `GET /clients/:clientId/exercise-stats` — same shape as the client stats endpoint, for that client.

### Tags (`/api/exercise-tags`) — global, not client-scoped
- `GET /` — list all tags (system + custom); any authenticated user (client or coach).
- `POST /` — create a custom tag (`name`, `color`); **coach role only** (route-level guard).
- `DELETE /:id` — delete a custom tag; **coach role only**. 409 if `isSystem` or if any
  `exerciseEntryTag` row references it.

All routes validated with Zod at the controller boundary; ownership checks in the service layer
(client can only touch their own entries; coach's client-scoped routes verify the client belongs to
that coach), per the project's standing two-place authorization rule.

---

## 4. Frontend structure

`cliente/src/features/exercise/`:
- `ExerciseLayout.jsx` — renders `AppHeader` (title depends on active sub-route) + `Outlet` + a new
  `ExerciseBottomNav.jsx` (Home/Calendar/Tags/Add) fixed at the bottom, **only when not in coach
  read-only mode**. Detects coach mode the same way `useNutritionScope` does — presence of `:clientId`.
- `useExerciseScope.js` — same pattern as `useNutritionScope.js`: returns `{ isCoach, clientId,
  apiBase, linkBase }`.
- `ExerciseHomeScreen.jsx` — fetches `exercise-stats`, renders year/week progress bars + weekly bar
  chart (reimplements the mockup's chart with Blaze tokens, not gray/shadow cards).
- `ExerciseCalendarScreen.jsx` — month grid (reuses the mockup's date-math helpers), tap a day to
  list that day's entries below; tapping an entry navigates to its detail route.
- `ExerciseAddScreen.jsx` — photo picker (reuses `imageCompress.js` like Nutrition's add flow), tag
  multi-select (fetched from `GET /exercise-tags`, no client-side custom-tag creation), date/time,
  description (required), biofeedback (optional). Client-only screen: the `add` child route is simply
  not registered under the coach per-client branch (see Routes below), and `POST /exercise-entries` is
  only exposed under `/api/me`, so there is no coach-facing path to it at either layer.
- `ExerciseTagsScreen.jsx` — read-only list (swatch + name) for clients. Coach's tag *management*
  (create/delete) lives separately (see below), not on this per-client-scoped screen.
- `ExerciseEntryDetailScreen.jsx` / `ExerciseEditEntryScreen.jsx` — mirrors Nutrition's pair; edit/
  delete controls hidden when `isCoach`.

### Routes (`router.jsx`)
- Client: `/exercise` → `ExerciseLayout`, children: index=`ExerciseHomeScreen`, `calendar`,
  `tags`, `add`, `:id`, `:id/edit`.
- Coach per-client: `/coach/clients/:clientId/exercise` → same `ExerciseLayout`, children: index=Home,
  `calendar`, `:id` (no `add`, `tags`, or `:id/edit` routes registered for this branch).
- Coach global: `/coach/tags` → new `CoachTagsScreen.jsx` (create form: name + color-palette picker;
  list with delete buttons), added as a sibling route under the existing `CoachLayout`, with a new
  "Tags" `NavLink` next to "Clients" in `CoachLayout.jsx`'s sidebar.

### Nav wiring (already done in the prior increment, no change needed)
`ClientSidebar.jsx`, `AppHeader.jsx`'s hamburger menu, `CoachClientLayout.jsx`'s desktop sidebar, and
`CoachClientHome.jsx`'s mobile module list already link to `/exercise` /
`/coach/clients/:clientId/exercise` — those links now resolve to the real module instead of the
placeholder built in the previous increment.

---

## 5. Visual design adaptation

Tag "pills" get a solid-fill color chip (existing Tailwind color family at the `-600`ish weight for
system tags, coach-picked family for custom ones) with white text, `rounded-none` (or a small
`rounded-full` — matches how Nutrition already renders its category pills, to be confirmed at
implementation time by checking that exact class), 2px border — no drop shadow. Stat cards, the
weekly bar chart, and calendar cells use the same 2px-border/no-shadow/`rounded-none` treatment as
existing Nutrition cards, not the mockup's `shadow-sm`/`rounded-xl`. Icons stay Lucide (`Dumbbell`,
`Calendar`, `Tag`-equivalent, `Plus` — already imported in `AppHeader.jsx`/`ClientSidebar.jsx`).

---

## 6. Testing

- Backend: unit tests for `exercise.service.js` (ownership checks, tag-in-use 409, stats math against
  known fixture dates) + integration tests per route (auth/role guards), following the existing
  Nutrition test structure.
- Frontend: component tests for tag multi-select, stats calculation display, and calendar day
  selection; a coach-mode smoke test confirming Add/Tags are unreachable and edit/delete are hidden.
