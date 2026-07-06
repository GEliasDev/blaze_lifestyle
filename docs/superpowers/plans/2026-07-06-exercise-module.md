# Exercise Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Exercise module end-to-end — backend (entries, photos, tags, stats) and frontend
(client Home/Calendar/Add/Tags + coach read-only view + coach global tag management) — per
`docs/superpowers/specs/2026-07-06-exercise-module-design.md`.

**Architecture:** Backend follows the existing `nutrition/` module layering exactly (model → schema →
service → controller → route). Frontend follows the existing `nutrition/` feature-folder pattern
(`useExerciseScope` mirrors `useNutritionScope`), with a new persistent bottom tab bar specific to
this module.

**Tech Stack:** JavaScript ESM, Express + Sequelize + PostgreSQL + Zod (backend); React + Vite +
Tailwind + React Router + react-i18next (frontend). No test framework exists in this repo today.

## Global Constraints

- **No TypeScript** — `.js`/`.jsx` only, ESM `import`/`export`.
- **No automated test framework exists in this repo** (confirmed: no vitest/jest, no `tests/`
  directory, no test script in either `package.json`). The user explicitly chose *not* to introduce
  one for this feature. Every task below is verified **manually** (syntax check while building,
  `curl` smoke test once wired, manual click-through in the browser) instead of an automated
  red/green test cycle. Don't add a test framework as a side effect of this plan.
- **MAX_PHOTOS = 5** per entry, same as Nutrition.
- **Design tokens:** brutalist — 2px borders, `rounded-none`, no shadows, Barlow Condensed uppercase
  headings via `font-heading`, primary color `bg-primary`/`border-primary`, danger `bg-danger`.
- **English-only UI strings**, added via `t("...")` keys in `cliente/src/locales/en.json` (per
  CLAUDE.md — no `es.json` mirror needed).
- **Authorization in two places:** Express route-level `roleGuard` AND service-level ownership check
  (`ownedEntry` / `assertCoachOwnsClient`), same as every other module.
- **`docs/` is gitignored** but specs/plans are force-added (`git add -f`) — every commit step below
  that touches this plan file itself is unnecessary (the plan doesn't need re-committing), but new
  source files use plain `git add`.

---

## Backend

### Task 1: Shared tag constants

**Files:**
- Modify: `servidor/src/shared/enums.js`

**Interfaces:**
- Produces: `TAG_COLOR_PALETTE` (array of 20 Tailwind `color-shade` strings) — consumed by Task 3
  (schema, for `createTagSchema`'s `color` validation). `SYSTEM_EXERCISE_TAGS` (array of
  `{ name, color }`, the 14 fixed tags from the mockup) — consumed by Task 4 (service's
  `ensureSystemTags`), which Task 7 then calls at boot.

- [ ] **Step 1: Add the constants**

Append to `servidor/src/shared/enums.js`:

```js
export const TAG_COLOR_PALETTE = [
  "blue-500", "purple-500", "red-500", "green-500", "yellow-500", "orange-500",
  "pink-500", "indigo-500", "cyan-500", "gray-700", "red-600", "stone-500",
  "emerald-600", "red-700", "teal-500", "lime-600", "amber-600", "violet-600",
  "rose-600", "sky-600",
];

export const SYSTEM_EXERCISE_TAGS = [
  { name: "Weightlifting", color: "blue-500" },
  { name: "Olympic Weightlifting", color: "purple-500" },
  { name: "Crossfit", color: "red-500" },
  { name: "Running", color: "green-500" },
  { name: "Bicycle", color: "yellow-500" },
  { name: "Movement", color: "orange-500" },
  { name: "Yoga", color: "pink-500" },
  { name: "Stretching", color: "indigo-500" },
  { name: "Swimming", color: "cyan-500" },
  { name: "Boxing", color: "gray-700" },
  { name: "Martial Arts", color: "red-600" },
  { name: "Rock Climbing", color: "stone-500" },
  { name: "Hiking", color: "emerald-600" },
  { name: "Injury", color: "red-700" },
];
```

- [ ] **Step 2: Verify syntax**

Run: `node --check servidor/src/shared/enums.js`
Expected: no output (exit code 0).

- [ ] **Step 3: Commit**

```bash
git add servidor/src/shared/enums.js
git commit -m "feat(exercise): add tag color palette and system tag constants"
```

---

### Task 2: Sequelize models

**Files:**
- Create: `servidor/src/modules/exercise/exerciseTag.model.js`
- Create: `servidor/src/modules/exercise/exerciseEntry.model.js`
- Create: `servidor/src/modules/exercise/exercisePhoto.model.js`
- Create: `servidor/src/modules/exercise/exerciseEntryTag.model.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ExerciseTagModel`, `ExerciseEntryModel`, `ExercisePhotoModel`, `ExerciseEntryTagModel` —
  consumed by Task 4 (service).

- [ ] **Step 1: Write the tag model**

`servidor/src/modules/exercise/exerciseTag.model.js`:

```js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

// isSystem=true for the 14 seeded tags (see shared/enums.js SYSTEM_EXERCISE_TAGS) — those can never
// be deleted. Custom tags (isSystem=false) are created/deleted by a coach only.
export class ExerciseTagModel extends Model {}

ExerciseTagModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    color: { type: DataTypes.STRING, allowNull: false },
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, tableName: "exercise_tags", underscored: true },
);
```

- [ ] **Step 2: Write the entry model**

`servidor/src/modules/exercise/exerciseEntry.model.js`:

```js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

// Free-form workout log: no assigned plan (unlike Nutrition). Tags and photos
// live in separate join/child tables — see exerciseEntryTag.model.js and
// exercisePhoto.model.js.
export class ExerciseEntryModel extends Model {}

ExerciseEntryModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    clientId: { type: DataTypes.UUID, allowNull: false },
    exercisedAt: { type: DataTypes.DATE, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    biofeedback: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: "exercise_entries", underscored: true },
);
```

- [ ] **Step 3: Write the photo model**

`servidor/src/modules/exercise/exercisePhoto.model.js` (identical shape to `mealPhoto.model.js`):

```js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class ExercisePhotoModel extends Model {}

ExercisePhotoModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    entryId: { type: DataTypes.UUID, allowNull: false },
    storageKey: { type: DataTypes.STRING, allowNull: false },
    thumbKey: { type: DataTypes.STRING, allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: "exercise_photos", underscored: true },
);
```

- [ ] **Step 4: Write the entry-tag join model**

`servidor/src/modules/exercise/exerciseEntryTag.model.js`:

```js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

// Plain many-to-many join row — queried manually in exercise.service.js, no
// Sequelize belongsToMany association (this codebase doesn't use associations
// elsewhere; see mealEntry/mealPhoto for the same manual-query convention).
export class ExerciseEntryTagModel extends Model {}

ExerciseEntryTagModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    entryId: { type: DataTypes.UUID, allowNull: false },
    tagId: { type: DataTypes.UUID, allowNull: false },
  },
  { sequelize, tableName: "exercise_entry_tags", underscored: true },
);
```

- [ ] **Step 5: Verify syntax**

Run: `node --check servidor/src/modules/exercise/exerciseTag.model.js && node --check servidor/src/modules/exercise/exerciseEntry.model.js && node --check servidor/src/modules/exercise/exercisePhoto.model.js && node --check servidor/src/modules/exercise/exerciseEntryTag.model.js`
Expected: no output (exit code 0).

- [ ] **Step 6: Commit**

```bash
git add servidor/src/modules/exercise/exerciseTag.model.js servidor/src/modules/exercise/exerciseEntry.model.js servidor/src/modules/exercise/exercisePhoto.model.js servidor/src/modules/exercise/exerciseEntryTag.model.js
git commit -m "feat(exercise): add Sequelize models for entries, photos, tags"
```

---

### Task 3: Zod schemas

**Files:**
- Create: `servidor/src/modules/exercise/exercise.schema.js`

**Interfaces:**
- Consumes: `TAG_COLOR_PALETTE` from `servidor/src/shared/index.js` (Task 1).
- Produces: `MAX_PHOTOS`, `createEntrySchema`, `editEntrySchema`, `listQuerySchema`,
  `createTagSchema` — consumed by Task 4 (service), Task 5 (controller), Task 6 (route).

- [ ] **Step 1: Write the schema file**

`servidor/src/modules/exercise/exercise.schema.js`:

```js
import { z } from "zod";
import { TAG_COLOR_PALETTE } from "../../shared/index.js";

export const MAX_PHOTOS = 5;

// Multipart form fields arrive as a single string when only one "tagIds" field
// was sent, and as an array only when 2+ were sent (multer/busboy behavior) —
// this normalizes both shapes to an array before validating.
const toArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const tagIdsSchema = z.preprocess(toArray, z.array(z.string().uuid()).min(1));

export const createEntrySchema = z.object({
  tagIds: tagIdsSchema,
  exercisedAt: z.string().datetime().optional(),
  description: z.string().min(1),
  biofeedback: z.string().optional(),
});

// The edit form is multipart (photos can be added/removed), so booleans/arrays
// arrive as strings — parsed inside the service, not via the validate middleware.
export const editEntrySchema = z.object({
  tagIds: tagIdsSchema.optional(),
  exercisedAt: z.string().datetime().optional(),
  description: z.string().min(1).optional(),
  biofeedback: z.string().optional(),
});

export const listQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1),
  color: z.enum(TAG_COLOR_PALETTE),
});
```

- [ ] **Step 2: Verify syntax**

Run: `node --check servidor/src/modules/exercise/exercise.schema.js`
Expected: no output (exit code 0).

- [ ] **Step 3: Commit**

```bash
git add servidor/src/modules/exercise/exercise.schema.js
git commit -m "feat(exercise): add Zod schemas for entries and tags"
```

---

### Task 4: Service layer

**Files:**
- Create: `servidor/src/modules/exercise/exercise.service.js`

**Interfaces:**
- Consumes: models from Task 2, `editEntrySchema`/`MAX_PHOTOS` from Task 3,
  `SYSTEM_EXERCISE_TAGS` from Task 1, `buildKey`/`makeThumbnail`/`putObject`/`deleteObject` from
  `servidor/src/lib/storage.js`, `CoachClientModel` from `servidor/src/modules/coaching/coachClients.model.js`,
  `HttpError` from `servidor/src/middleware/error.js`.
- Produces: `exerciseService` with `createEntry(clientId, data, files)`, `listEntries(clientId, range)`,
  `getEntry(clientId, id)`, `updateEntry(clientId, id, rawBody, files, keepKeys)`,
  `deleteEntry(clientId, id)`, `photoAccess(requester, key)`, `stats(clientId)`, `ensureSystemTags()`,
  `listTags()`, `createTag(data)`, `deleteTag(id)` — consumed by Task 5 (controller) and Task 7 (server boot).

- [ ] **Step 1: Write the service**

`servidor/src/modules/exercise/exercise.service.js`:

```js
import { Op } from "sequelize";
import { ExerciseEntryModel } from "./exerciseEntry.model.js";
import { ExercisePhotoModel } from "./exercisePhoto.model.js";
import { ExerciseTagModel } from "./exerciseTag.model.js";
import { ExerciseEntryTagModel } from "./exerciseEntryTag.model.js";
import { CoachClientModel } from "../coaching/coachClients.model.js";
import { buildKey, makeThumbnail, putObject, deleteObject } from "../../lib/storage.js";
import { editEntrySchema, MAX_PHOTOS } from "./exercise.schema.js";
import { SYSTEM_EXERCISE_TAGS } from "../../shared/index.js";
import { HttpError } from "../../middleware/error.js";

async function photosFor(entryId) {
  return ExercisePhotoModel.findAll({ where: { entryId }, order: [["position", "ASC"]] });
}

async function tagsFor(entryId) {
  const links = await ExerciseEntryTagModel.findAll({ where: { entryId } });
  if (links.length === 0) return [];
  const tags = await ExerciseTagModel.findAll({ where: { id: links.map((l) => l.tagId) } });
  const byId = new Map(tags.map((t) => [t.id, t]));
  return links.map((l) => byId.get(l.tagId)).filter(Boolean);
}

function serializeTag(tag) {
  return { id: tag.id, name: tag.name, color: tag.color, isSystem: tag.isSystem };
}

async function serialize(entry) {
  const [photos, tags] = await Promise.all([photosFor(entry.id), tagsFor(entry.id)]);
  return {
    id: entry.id,
    clientId: entry.clientId,
    exercisedAt: entry.exercisedAt,
    description: entry.description,
    biofeedback: entry.biofeedback,
    photos: photos.map((p) => ({ storageKey: p.storageKey, thumbKey: p.thumbKey, position: p.position })),
    tags: tags.map(serializeTag),
  };
}

// Exercise photos use their own key prefixes ("exercise" / "exercise-thumbs"),
// distinct from Nutrition's ("meals" / "thumbs") — see photos.route.js, which
// dispatches the shared /api/photos/:prefix/:file proxy by prefix.
async function addPhotos(entryId, files, startPos = 0) {
  for (let i = 0; i < (files?.length ?? 0); i++) {
    const full = buildKey("exercise", "jpg");
    const thumb = buildKey("exercise-thumbs", "jpg");
    await putObject(full, files[i].buffer, files[i].mimetype);
    await putObject(thumb, await makeThumbnail(files[i].buffer), "image/jpeg");
    await ExercisePhotoModel.create({ entryId, storageKey: full, thumbKey: thumb, position: startPos + i });
  }
}

async function setTags(entryId, tagIds) {
  await ExerciseEntryTagModel.destroy({ where: { entryId } });
  for (const tagId of tagIds) {
    await ExerciseEntryTagModel.create({ entryId, tagId });
  }
}

async function ownedEntry(clientId, id) {
  const entry = await ExerciseEntryModel.findByPk(id);
  if (!entry || entry.clientId !== clientId) throw new HttpError(404, "Entry not found");
  return entry;
}

function dayKey(date) {
  return new Date(date).toLocaleDateString("en-CA");
}

export const exerciseService = {
  async createEntry(clientId, data, files) {
    if ((files?.length ?? 0) > MAX_PHOTOS) throw new HttpError(400, `An entry can have at most ${MAX_PHOTOS} photos`);
    const entry = await ExerciseEntryModel.create({
      clientId,
      exercisedAt: data.exercisedAt ?? new Date(),
      description: data.description,
      biofeedback: data.biofeedback || null,
    });
    await addPhotos(entry.id, files, 0);
    await setTags(entry.id, data.tagIds);
    return serialize(entry);
  },

  async listEntries(clientId, range = {}) {
    const exercisedAt = {};
    if (range.from) exercisedAt[Op.gte] = range.from;
    if (range.to) exercisedAt[Op.lte] = range.to;
    const where = { clientId, ...(Object.keys(exercisedAt).length ? { exercisedAt } : {}) };
    const entries = await ExerciseEntryModel.findAll({
      where,
      order: [["exercised_at", "DESC"]],
      ...(range.limit ? { limit: range.limit } : {}),
    });
    const out = [];
    for (const e of entries) out.push(await serialize(e));
    return out;
  },

  async getEntry(clientId, id) {
    const entry = await ownedEntry(clientId, id);
    return serialize(entry);
  },

  // Multipart edit: text fields in rawBody, new photos in files, storageKeys of
  // existing photos to keep in keepKeys. Photos not kept are deleted; new ones
  // are appended. Total is capped at MAX_PHOTOS.
  async updateEntry(clientId, id, rawBody, files = [], keepKeys = []) {
    const entry = await ownedEntry(clientId, id);
    const data = editEntrySchema.parse(rawBody);
    if (data.biofeedback === "") data.biofeedback = null;

    const existing = await photosFor(id);
    const keep = new Set(keepKeys);
    const kept = existing.filter((p) => keep.has(p.storageKey));
    const toDelete = existing.filter((p) => !keep.has(p.storageKey));
    if (kept.length + (files?.length ?? 0) > MAX_PHOTOS) {
      throw new HttpError(400, `An entry can have at most ${MAX_PHOTOS} photos`);
    }

    for (const p of toDelete) {
      await deleteObject(p.storageKey);
      await deleteObject(p.thumbKey);
      await p.destroy();
    }
    for (let i = 0; i < kept.length; i++) {
      if (kept[i].position !== i) await kept[i].update({ position: i });
    }
    await addPhotos(id, files, kept.length);

    if (data.tagIds) await setTags(id, data.tagIds);
    const { tagIds, ...entryFields } = data;
    await entry.update(entryFields);
    return serialize(entry);
  },

  // Hard-delete: removes the entry row, its tag links, its photo rows, and the
  // stored objects.
  async deleteEntry(clientId, id) {
    const entry = await ownedEntry(clientId, id);
    const photos = await photosFor(id);
    for (const p of photos) {
      await deleteObject(p.storageKey);
      await deleteObject(p.thumbKey);
      await p.destroy();
    }
    await ExerciseEntryTagModel.destroy({ where: { entryId: id } });
    await entry.destroy();
  },

  // Returns the storage key if the requester may read it (the owning client, or
  // a coach linked to the entry's client), else throws.
  async photoAccess(requester, key) {
    const photo = await ExercisePhotoModel.findOne({ where: { [key.startsWith("exercise-thumbs/") ? "thumbKey" : "storageKey"]: key } });
    if (!photo) throw new HttpError(404, "Photo not found");
    const entry = await ExerciseEntryModel.findByPk(photo.entryId);
    if (!entry) throw new HttpError(404, "Photo not found");
    if (requester.role === "client") {
      if (entry.clientId !== requester.sub) throw new HttpError(403, "Forbidden");
    } else {
      const link = await CoachClientModel.findOne({ where: { coachId: requester.sub, clientId: entry.clientId } });
      if (!link) throw new HttpError(403, "Forbidden");
    }
    return key;
  },

  // Year: distinct trained days this year ÷ days elapsed this year.
  // Week: distinct trained days this week ÷ days elapsed this week (Monday start).
  // weeklyChart: one { week, days } entry per elapsed week of the year so far —
  // same shape as the mockup's getWeeklyChartData().
  async stats(clientId) {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const entries = await ExerciseEntryModel.findAll({
      where: { clientId, exercisedAt: { [Op.gte]: yearStart, [Op.lte]: now } },
    });
    const trainedDays = new Set(entries.map((e) => dayKey(e.exercisedAt)));
    const yearElapsedDays = Math.floor((now - yearStart) / 86400000) + 1;
    const yearTrainedDays = trainedDays.size;

    const weekStart = new Date(now);
    const dow = (weekStart.getDay() + 6) % 7; // Monday = 0
    weekStart.setDate(weekStart.getDate() - dow);
    weekStart.setHours(0, 0, 0, 0);
    const weekElapsedDays = Math.floor((now - weekStart) / 86400000) + 1;
    const weekTrainedDays = [...trainedDays].filter((d) => new Date(`${d}T00:00:00`) >= weekStart).length;

    const weeksNeeded = Math.ceil(yearElapsedDays / 7);
    const weeklyChart = [];
    for (let week = 1; week <= weeksNeeded; week++) {
      const wStart = new Date(yearStart);
      wStart.setDate(yearStart.getDate() + (week - 1) * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);
      const days = [...trainedDays].filter((d) => {
        const dt = new Date(`${d}T00:00:00`);
        return dt >= wStart && dt <= wEnd;
      }).length;
      weeklyChart.push({ week, days });
    }

    return { yearTrainedDays, yearElapsedDays, weekTrainedDays, weekElapsedDays, weeklyChart };
  },

  // Idempotent: safe to call on every server boot (findOrCreate by name).
  async ensureSystemTags() {
    for (const tag of SYSTEM_EXERCISE_TAGS) {
      await ExerciseTagModel.findOrCreate({ where: { name: tag.name }, defaults: { ...tag, isSystem: true } });
    }
  },

  async listTags() {
    const tags = await ExerciseTagModel.findAll({ order: [["is_system", "DESC"], ["name", "ASC"]] });
    return tags.map(serializeTag);
  },

  async createTag(data) {
    const existing = await ExerciseTagModel.findOne({ where: { name: data.name } });
    if (existing) throw new HttpError(409, "A tag with this name already exists");
    const tag = await ExerciseTagModel.create({ name: data.name, color: data.color, isSystem: false });
    return serializeTag(tag);
  },

  async deleteTag(id) {
    const tag = await ExerciseTagModel.findByPk(id);
    if (!tag) throw new HttpError(404, "Tag not found");
    if (tag.isSystem) throw new HttpError(409, "System tags can't be deleted");
    const inUse = await ExerciseEntryTagModel.findOne({ where: { tagId: id } });
    if (inUse) throw new HttpError(409, "Tag is in use by existing entries");
    await tag.destroy();
  },
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check servidor/src/modules/exercise/exercise.service.js`
Expected: no output (exit code 0).

- [ ] **Step 3: Commit**

```bash
git add servidor/src/modules/exercise/exercise.service.js
git commit -m "feat(exercise): add service layer (entries, tags, stats)"
```

---

### Task 5: Controllers

**Files:**
- Create: `servidor/src/modules/exercise/exercise.controller.js`

**Interfaces:**
- Consumes: `exerciseService` (Task 4), `listQuerySchema`/`createTagSchema` (Task 3), `getObject`
  from `servidor/src/lib/storage.js`, `assertCoachOwnsClient` from `servidor/src/lib/ownership.js`.
- Produces: `exerciseController` (`.create`, `.list`, `.get`, `.update`, `.remove`, `.stats`, `.photo`),
  `coachExerciseController` (`.list`, `.get`, `.stats`), `tagsController` (`.list`, `.create`,
  `.remove`) — consumed by Task 6 (routes).

- [ ] **Step 1: Write the controllers**

`servidor/src/modules/exercise/exercise.controller.js`:

```js
import { exerciseService } from "./exercise.service.js";
import { listQuerySchema, createTagSchema } from "./exercise.schema.js";
import { getObject } from "../../lib/storage.js";
import { assertCoachOwnsClient } from "../../lib/ownership.js";

export const exerciseController = {
  async create(req, res, next) {
    try { res.status(201).json(await exerciseService.createEntry(req.user.sub, req.body, req.files)); }
    catch (err) { next(err); }
  },
  async list(req, res, next) {
    try { res.json(await exerciseService.listEntries(req.user.sub, listQuerySchema.parse(req.query))); }
    catch (err) { next(err); }
  },
  async get(req, res, next) {
    try { res.json(await exerciseService.getEntry(req.user.sub, req.params.id)); }
    catch (err) { next(err); }
  },
  async update(req, res, next) {
    try {
      const keep = [].concat(req.body?.keep ?? []);
      res.json(await exerciseService.updateEntry(req.user.sub, req.params.id, req.body, req.files, keep));
    } catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try { await exerciseService.deleteEntry(req.user.sub, req.params.id); res.status(204).end(); }
    catch (err) { next(err); }
  },
  async stats(req, res, next) {
    try { res.json(await exerciseService.stats(req.user.sub)); }
    catch (err) { next(err); }
  },
  async photo(req, res, next) {
    try {
      const key = `${req.params.prefix}/${req.params.file}`;
      await exerciseService.photoAccess(req.user, key);
      const { body, contentType } = await getObject(key);
      res.setHeader("Content-Type", contentType);
      body.pipe(res);
    } catch (err) { next(err); }
  },
};

// Coach acting on a specific client's entries (ownership verified per request, read-only).
export const coachExerciseController = {
  async list(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await exerciseService.listEntries(req.params.clientId, listQuerySchema.parse(req.query)));
    } catch (err) { next(err); }
  },
  async get(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await exerciseService.getEntry(req.params.clientId, req.params.id));
    } catch (err) { next(err); }
  },
  async stats(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await exerciseService.stats(req.params.clientId));
    } catch (err) { next(err); }
  },
};

// Tags are global (not client-scoped) — any authenticated user can list, only a coach can write.
export const tagsController = {
  async list(req, res, next) {
    try { res.json(await exerciseService.listTags()); } catch (err) { next(err); }
  },
  async create(req, res, next) {
    try { res.status(201).json(await exerciseService.createTag(createTagSchema.parse(req.body))); }
    catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try { await exerciseService.deleteTag(req.params.id); res.status(204).end(); }
    catch (err) { next(err); }
  },
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check servidor/src/modules/exercise/exercise.controller.js`
Expected: no output (exit code 0).

- [ ] **Step 3: Commit**

```bash
git add servidor/src/modules/exercise/exercise.controller.js
git commit -m "feat(exercise): add controllers"
```

---

### Task 6: Routes, shared photo proxy, and app wiring

Nutrition's existing `/api/photos/:prefix/:file` proxy only knows how to look up `MealPhotoModel`.
Exercise photos need the same authenticated proxy but must resolve against `ExercisePhotoModel`
instead — this task relocates the proxy into its own tiny module that dispatches by key prefix, so
both modules' photos are servable from the one `/api/photos` mount.

**Files:**
- Create: `servidor/src/modules/exercise/exercise.route.js`
- Create: `servidor/src/modules/photos/photos.route.js`
- Modify: `servidor/src/modules/nutrition/nutrition.route.js` (remove the now-relocated `photosRouter`)
- Modify: `servidor/src/app.js` (wire new routers, import `photosRouter` from its new location)

**Interfaces:**
- Consumes: `exerciseController`/`coachExerciseController`/`tagsController` (Task 5),
  `createEntrySchema`/`MAX_PHOTOS` (Task 3), `nutritionController` (existing), `authGuard`/`roleGuard`
  (existing), `validate` (existing).
- Produces: `clientExerciseRouter`, `coachExerciseRouter`, `tagsRouter`, relocated `photosRouter` —
  consumed by Task 7 (server boot smoke test) and the frontend (as the actual HTTP surface).

- [ ] **Step 1: Write the exercise route**

`servidor/src/modules/exercise/exercise.route.js`:

```js
import { Router } from "express";
import multer from "multer";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createEntrySchema, MAX_PHOTOS } from "./exercise.schema.js";
import { exerciseController, coachExerciseController, tagsController } from "./exercise.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const photos = upload.array("photos", MAX_PHOTOS);

export const clientExerciseRouter = Router(); // mounted at /api/me
clientExerciseRouter.use(authGuard, roleGuard("client"));
clientExerciseRouter.get("/exercise-entries", exerciseController.list);
clientExerciseRouter.post("/exercise-entries", photos, validate(createEntrySchema), exerciseController.create);
clientExerciseRouter.get("/exercise-entries/:id", exerciseController.get);
clientExerciseRouter.patch("/exercise-entries/:id", photos, exerciseController.update);
clientExerciseRouter.delete("/exercise-entries/:id", exerciseController.remove);
clientExerciseRouter.get("/exercise-stats", exerciseController.stats);

// Coach acting on a specific client's entries: mounted at /api/coach — read-only (no create/edit/delete).
export const coachExerciseRouter = Router();
coachExerciseRouter.use(authGuard, roleGuard("coach"));
coachExerciseRouter.get("/clients/:clientId/exercise-entries", coachExerciseController.list);
coachExerciseRouter.get("/clients/:clientId/exercise-entries/:id", coachExerciseController.get);
coachExerciseRouter.get("/clients/:clientId/exercise-stats", coachExerciseController.stats);

// Global tags (not client-scoped): mounted at /api/exercise-tags.
export const tagsRouter = Router();
tagsRouter.use(authGuard);
tagsRouter.get("/", tagsController.list);
tagsRouter.post("/", roleGuard("coach"), tagsController.create);
tagsRouter.delete("/:id", roleGuard("coach"), tagsController.remove);
```

- [ ] **Step 2: Write the shared photo proxy**

`servidor/src/modules/photos/photos.route.js`:

```js
import { Router } from "express";
import { authGuard } from "../../middleware/auth.js";
import { nutritionController } from "../nutrition/nutrition.controller.js";
import { exerciseController } from "../exercise/exercise.controller.js";

// Key format is "<prefix>/<file>". Nutrition uses "meals"/"thumbs"; Exercise
// uses "exercise"/"exercise-thumbs" — dispatch to the matching module's photo
// handler, which knows which photo table (and ownership rule) to check.
export const photosRouter = Router();
photosRouter.use(authGuard);
photosRouter.get("/:prefix/:file", (req, res, next) => {
  const isExercise = req.params.prefix === "exercise" || req.params.prefix === "exercise-thumbs";
  return (isExercise ? exerciseController : nutritionController).photo(req, res, next);
});
```

- [ ] **Step 3: Remove the old photo proxy from the nutrition route file**

In `servidor/src/modules/nutrition/nutrition.route.js`, delete these lines (the trailing block):

```js
// Authenticated photo proxy (both roles): mounted at /api/photos, key is "<prefix>/<file>"
export const photosRouter = Router();
photosRouter.use(authGuard);
photosRouter.get("/:prefix/:file", nutritionController.photo);
```

The file should now end after the `coachEntriesRouter` routes, with no `photosRouter` export left in
it.

- [ ] **Step 4: Wire everything into app.js**

Replace the imports and route mounting in `servidor/src/app.js`:

```js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error.js";
import { generalLimiter } from "./middleware/rateLimit.js";
import { logger } from "./lib/logger.js";
import { authRouter } from "./modules/auth/auth.route.js";
import { clientEntriesRouter, coachEntriesRouter } from "./modules/nutrition/nutrition.route.js";
import { clientExerciseRouter, coachExerciseRouter, tagsRouter } from "./modules/exercise/exercise.route.js";
import { photosRouter } from "./modules/photos/photos.route.js";
import { coachingRouter } from "./modules/coaching/coaching.route.js";
import { accountRouter } from "./modules/account/account.route.js";

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(pinoHttp({ logger }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(generalLimiter);

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRouter);
  app.use("/api/me", clientEntriesRouter);
  app.use("/api/me", clientExerciseRouter);
  app.use("/api/photos", photosRouter);
  app.use("/api/coach", coachingRouter);
  app.use("/api/coach", coachEntriesRouter);
  app.use("/api/coach", coachExerciseRouter);
  app.use("/api/exercise-tags", tagsRouter);
  app.use("/api/me", accountRouter);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 5: Verify syntax**

Run: `node --check servidor/src/modules/exercise/exercise.route.js && node --check servidor/src/modules/photos/photos.route.js && node --check servidor/src/modules/nutrition/nutrition.route.js && node --check servidor/src/app.js`
Expected: no output (exit code 0).

- [ ] **Step 6: Commit**

```bash
git add servidor/src/modules/exercise/exercise.route.js servidor/src/modules/photos/photos.route.js servidor/src/modules/nutrition/nutrition.route.js servidor/src/app.js
git commit -m "feat(exercise): add routes, relocate photo proxy to support both modules"
```

---

### Task 7: Boot-time tag seeding + backend smoke test

**Files:**
- Modify: `servidor/src/server.js`

**Interfaces:**
- Consumes: `exerciseService.ensureSystemTags()` (Task 4).
- Produces: a running backend with the full Exercise API reachable — consumed by every frontend task
  from here on (they call these endpoints) and by the final end-to-end task (Task 19).

- [ ] **Step 1: Seed system tags at boot**

`servidor/src/server.js`:

```js
import { sequelize } from "./lib/db.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { exerciseService } from "./modules/exercise/exercise.service.js";

// Importing createApp pulls in the route → controller → service → model graph,
// which registers every Sequelize model before we sync.
const app = createApp();

// NOTE: sync({ alter: true }) creates tables if missing and adds new columns to
// the existing dev DB without dropping data. It does NOT safely handle column
// renames or type changes — a proper migration tool (umzug/sequelize-cli) is
// planned for production.
await sequelize.authenticate();
await sequelize.sync({ alter: true });
await exerciseService.ensureSystemTags();

app.listen(config.port, () => {
  console.log(`API listening on :${config.port}`);
});
```

- [ ] **Step 2: Verify syntax**

Run: `node --check servidor/src/server.js`
Expected: no output (exit code 0).

- [ ] **Step 3: Start the server and confirm system tags seeded**

Run (from `servidor/`): `npm run dev`
Wait for `API listening on :4000` in the log, then in another terminal:

```bash
curl -s http://localhost:4000/api/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 4: Smoke-test the full flow with curl**

Register a coach and a client, link them, create a custom tag, log an entry, and read it back:

```bash
# Register coach
COACH=$(curl -s -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Coach Test","email":"coachtest@example.com","password":"password123","role":"coach"}')
COACH_TOKEN=$(echo "$COACH" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).accessToken))")
COACH_CODE=$(echo "$COACH" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).user.coachCode))")

# Register client linked to that coach
CLIENT=$(curl -s -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" \
  -d "{\"name\":\"Client Test\",\"email\":\"clienttest@example.com\",\"password\":\"password123\",\"role\":\"client\",\"coachCode\":\"$COACH_CODE\"}")
CLIENT_TOKEN=$(echo "$CLIENT" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).accessToken))")

# List system tags (should be 14)
curl -s http://localhost:4000/api/exercise-tags -H "Authorization: Bearer $CLIENT_TOKEN" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).length))"

# Coach creates a custom tag
TAG=$(curl -s -X POST http://localhost:4000/api/exercise-tags -H "Authorization: Bearer $COACH_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Personal Training","color":"teal-500"}')
TAG_ID=$(echo "$TAG" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).id))")

# Client logs an entry with that tag (no photos, for this smoke test)
curl -s -X POST http://localhost:4000/api/me/exercise-entries -H "Authorization: Bearer $CLIENT_TOKEN" \
  -F "tagIds=$TAG_ID" -F "description=Morning session" -F "biofeedback=Felt good"

# Client lists entries (should show 1)
curl -s http://localhost:4000/api/me/exercise-entries -H "Authorization: Bearer $CLIENT_TOKEN"

# Client gets stats
curl -s http://localhost:4000/api/me/exercise-stats -H "Authorization: Bearer $CLIENT_TOKEN"

# Coach tries to delete the in-use tag — must fail 409
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "http://localhost:4000/api/exercise-tags/$TAG_ID" -H "Authorization: Bearer $COACH_TOKEN"
```

Expected: tag list length `14`; entry POST returns `201` with the entry JSON including
`"tags":[{"name":"Personal Training",...}]`; entries list shows 1 entry; stats JSON shows
`yearTrainedDays: 1`, `weekTrainedDays: 1`; the delete-in-use attempt prints `409`.

- [ ] **Step 5: Commit**

```bash
git add servidor/src/server.js
git commit -m "feat(exercise): seed system tags at boot"
```

---

## Frontend

### Task 8: Tag color palette + Tailwind safelist

Tag colors are stored as data (`"blue-500"`, etc.) and interpolated into class names at runtime
(`` `bg-${tag.color}` ``). Tailwind's build-time class scanner can't see those dynamically-built
strings, so without a safelist the CSS for those classes would never be generated and tag chips would
render with no background color at all.

**Files:**
- Create: `cliente/src/features/exercise/tagColors.js`
- Modify: `cliente/tailwind.config.js`

**Interfaces:**
- Produces: `TAG_COLOR_PALETTE` (client-side copy, per the project convention that the client keeps
  its own copy of shared constants) — consumed by Task 17 (`CoachTagsScreen`).

- [ ] **Step 1: Add the client-side palette copy**

`cliente/src/features/exercise/tagColors.js`:

```js
// Client-side copy of servidor/src/shared/enums.js's TAG_COLOR_PALETTE — kept
// in sync manually (see CLAUDE.md: "the client keeps its own copies").
export const TAG_COLOR_PALETTE = [
  "blue-500", "purple-500", "red-500", "green-500", "yellow-500", "orange-500",
  "pink-500", "indigo-500", "cyan-500", "gray-700", "red-600", "stone-500",
  "emerald-600", "red-700", "teal-500", "lime-600", "amber-600", "violet-600",
  "rose-600", "sky-600",
];
```

- [ ] **Step 2: Safelist the corresponding Tailwind classes**

`cliente/tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  // Tag colors are chosen at runtime from TAG_COLOR_PALETTE (tagColors.js) and
  // interpolated into `bg-${color}` class names, which Tailwind's static
  // scanner can't see — safelist keeps these classes in the generated CSS.
  safelist: [
    "bg-blue-500", "bg-purple-500", "bg-red-500", "bg-green-500", "bg-yellow-500", "bg-orange-500",
    "bg-pink-500", "bg-indigo-500", "bg-cyan-500", "bg-gray-700", "bg-red-600", "bg-stone-500",
    "bg-emerald-600", "bg-red-700", "bg-teal-500", "bg-lime-600", "bg-amber-600", "bg-violet-600",
    "bg-rose-600", "bg-sky-600",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FF3C00",
        ink: "#000000",
        success: "#22C55E",
        danger: "#EF4444",
      },
      fontFamily: {
        heading: ['"Barlow Condensed"', "system-ui", "sans-serif"],
        body: ['"Barlow"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Verify the build picks up the safelist**

Run (from `cliente/`): `npm run build`
Expected: build succeeds; then run `grep -o "bg-teal-500" dist/assets/*.css` — expect at least one match (confirms the safelisted class made it into the compiled CSS even though nothing in JSX literally contains the string `bg-teal-500` yet).

- [ ] **Step 4: Commit**

```bash
git add cliente/src/features/exercise/tagColors.js cliente/tailwind.config.js
git commit -m "feat(exercise): add tag color palette and Tailwind safelist"
```

---

### Task 9: i18n keys

**Files:**
- Modify: `cliente/src/locales/en.json`

**Interfaces:**
- Produces: an `"exercise"` translation namespace — consumed by every screen task from here on.

- [ ] **Step 1: Add the exercise namespace**

In `cliente/src/locales/en.json`, add a new top-level key (after `"module"` is fine):

```json
  "exercise": {
    "tracker": "Exercise Tracker",
    "navHome": "Home", "navCalendar": "Calendar", "navTags": "Tags", "navAdd": "Add",
    "yearProgress": "Year Progress", "weekProgress": "Week Progress", "daysTrained": "days trained",
    "weeklyChart": "Weekly Training Progress", "week": "Week",
    "calendar": "Calendar", "nextMonth": "Next month", "selectDay": "Select a day to view workouts", "noEntriesDay": "No workouts on this day",
    "addEntry": "Add Entry", "photos": "Photos", "maxPhotos": "(max 5)", "addPhotos": "Add photos", "processingPhotos": "Optimizing photos…",
    "tags": "Tags", "date": "Date", "time": "Time", "description": "Description", "descriptionHint": "Describe your workout…",
    "biofeedback": "Biofeedback", "biofeedbackHint": "How did you feel? Notes for next time…", "save": "Save entry",
    "detail": "Detail", "edit": "Edit", "editEntry": "Edit Entry", "saveChanges": "Save changes",
    "delete": "Delete", "deleteConfirm": "Delete this entry? This can't be undone.", "noEntries": "No entries yet",
    "manageTags": "Manage Tags", "newTag": "New tag", "tagName": "Tag name", "addTag": "Add tag", "deleteTag": "Delete tag"
  },
```

Keep the file valid JSON (add a trailing comma after the `"module"` block's closing `}`, none after
this new block if it's followed directly by `"nutrition"`).

- [ ] **Step 2: Verify it's valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('cliente/src/locales/en.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add cliente/src/locales/en.json
git commit -m "feat(exercise): add i18n strings"
```

---

### Task 10: `useExerciseScope` hook

**Files:**
- Create: `cliente/src/features/exercise/useExerciseScope.js`

**Interfaces:**
- Produces: `useExerciseScope()` returning `{ isCoach, clientId, apiBase, statsBase, linkBase }` —
  consumed by every screen task from here on.

- [ ] **Step 1: Write the hook**

`cliente/src/features/exercise/useExerciseScope.js`:

```js
import { useParams } from "react-router-dom";

// Same :clientId-presence pattern as nutrition/useNutritionScope.js — the
// presence of a :clientId route param means a coach is viewing a client's
// data (read-only for Exercise; see ExerciseBottomNav for the reduced nav).
export function useExerciseScope() {
  const { clientId } = useParams();
  if (clientId) {
    return {
      isCoach: true,
      clientId,
      apiBase: `/coach/clients/${clientId}/exercise-entries`,
      statsBase: `/coach/clients/${clientId}/exercise-stats`,
      linkBase: `/coach/clients/${clientId}/exercise`,
    };
  }
  return {
    isCoach: false,
    clientId: null,
    apiBase: "/me/exercise-entries",
    statsBase: "/me/exercise-stats",
    linkBase: "/exercise",
  };
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check cliente/src/features/exercise/useExerciseScope.js`
Expected: no output (exit code 0). (Node can syntax-check JSX-free `.js` files directly; this file
has no JSX.)

- [ ] **Step 3: Commit**

```bash
git add cliente/src/features/exercise/useExerciseScope.js
git commit -m "feat(exercise): add useExerciseScope hook"
```

---

### Task 11: `ExerciseBottomNav` + `ExerciseLayout`

**Files:**
- Create: `cliente/src/features/exercise/ExerciseBottomNav.jsx`
- Create: `cliente/src/features/exercise/ExerciseLayout.jsx`

**Interfaces:**
- Consumes: `useExerciseScope` (Task 10).
- Produces: `<ExerciseLayout />` (the route element mounted at `/exercise` and
  `/coach/clients/:clientId/exercise`) — consumed by Task 18 (router wiring).

- [ ] **Step 1: Write the bottom nav**

`cliente/src/features/exercise/ExerciseBottomNav.jsx`:

```jsx
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Calendar, Tag, Plus } from "lucide-react";

// Coach mode (isCoach=true) only gets Home + Calendar — Add and Tags are
// client-only actions (see exercise.route.js: those endpoints don't even
// exist under /api/coach).
export function ExerciseBottomNav({ linkBase, isCoach }) {
  const { t } = useTranslation();
  const items = isCoach
    ? [
        { to: "", icon: Home, key: "exercise.navHome", end: true },
        { to: "calendar", icon: Calendar, key: "exercise.navCalendar" },
      ]
    : [
        { to: "", icon: Home, key: "exercise.navHome", end: true },
        { to: "calendar", icon: Calendar, key: "exercise.navCalendar" },
        { to: "tags", icon: Tag, key: "exercise.navTags" },
        { to: "add", icon: Plus, key: "exercise.navAdd" },
      ];
  return (
    <nav className="sticky bottom-0 z-30 bg-white border-t-2 border-border flex">
      {items.map(({ to, icon: Icon, key, end }) => (
        <NavLink
          key={key}
          to={`${linkBase}${to ? `/${to}` : ""}`}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center min-h-[56px] gap-1 font-heading uppercase tracking-wide text-xs ${isActive ? "text-primary" : "text-ink/60"}`
          }
        >
          <Icon className="w-5 h-5" />
          {t(key)}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Write the layout**

`cliente/src/features/exercise/ExerciseLayout.jsx`:

```jsx
import { Outlet } from "react-router-dom";
import { ExerciseBottomNav } from "./ExerciseBottomNav.jsx";
import { useExerciseScope } from "./useExerciseScope.js";

// Each child screen owns its own AppHeader (titles differ per screen — Home
// says "Exercise Tracker", Calendar says "Calendar", etc. — same convention
// as Nutrition's screens). This layout only provides the persistent bottom
// tab bar around whichever child route is active.
export function ExerciseLayout() {
  const { isCoach, linkBase } = useExerciseScope();
  return (
    <div className="h-dvh flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Outlet />
      </div>
      <ExerciseBottomNav linkBase={linkBase} isCoach={isCoach} />
    </div>
  );
}
```

- [ ] **Step 3: Note on verification**

`.jsx` files can't be syntax-checked in isolation with plain `node --check` (it doesn't understand
JSX, and this repo has no standalone babel/JSX toolchain to invoke outside of Vite). There's nothing
to run here — the real verification for every `.jsx` file in this plan happens once in Task 18 Step 3
(`npm run build`), which compiles the whole app and will fail loudly on any JSX syntax error. Proceed
straight to committing.

- [ ] **Step 4: Commit**

```bash
git add cliente/src/features/exercise/ExerciseBottomNav.jsx cliente/src/features/exercise/ExerciseLayout.jsx
git commit -m "feat(exercise): add ExerciseLayout and bottom nav"
```

---

### Task 12: `ExerciseHomeScreen`

**Files:**
- Create: `cliente/src/features/exercise/ExerciseHomeScreen.jsx`

**Interfaces:**
- Consumes: `useExerciseScope` (Task 10), `AppHeader`/`Spinner` (existing components), `api` (existing).
- Produces: `<ExerciseHomeScreen />` — consumed by Task 18 (router wiring), as the index route for
  `ExerciseLayout`.

- [ ] **Step 1: Write the screen**

`cliente/src/features/exercise/ExerciseHomeScreen.jsx`:

```jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { api } from "../../lib/api.js";
import { useExerciseScope } from "./useExerciseScope.js";

export function ExerciseHomeScreen() {
  const { t } = useTranslation();
  const { isCoach, statsBase } = useExerciseScope();
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get(statsBase).then(setStats).catch(() => setStats(false)); }, [statsBase]);

  return (
    <>
      <AppHeader title={t("exercise.tracker").toUpperCase()} showBack={isCoach} backTo={isCoach ? "/coach" : null} />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {stats === null ? <Spinner /> : stats === false ? (
          <p className="text-ink/50 text-sm text-center p-8">{t("common.error")}</p>
        ) : (
          <>
            <section className="border-2 border-border p-4 text-center">
              <h2 className="font-heading uppercase tracking-wide text-sm text-ink/60 mb-2">{t("exercise.yearProgress")}</h2>
              <div className="font-heading text-3xl font-bold">{stats.yearTrainedDays}/{stats.yearElapsedDays}</div>
              <p className="text-ink/60 text-sm">{t("exercise.daysTrained")}</p>
              <div className="mt-3 h-2 bg-ink/10">
                <div className="h-2 bg-primary" style={{ width: `${Math.min(100, Math.round((stats.yearTrainedDays / stats.yearElapsedDays) * 100))}%` }} />
              </div>
            </section>

            <section className="border-2 border-border p-4 text-center">
              <h2 className="font-heading uppercase tracking-wide text-sm text-ink/60 mb-2">{t("exercise.weekProgress")}</h2>
              <div className="font-heading text-3xl font-bold">{stats.weekTrainedDays}/{stats.weekElapsedDays}</div>
              <p className="text-ink/60 text-sm">{t("exercise.daysTrained")}</p>
              <div className="mt-3 h-2 bg-ink/10">
                <div className="h-2 bg-primary" style={{ width: `${Math.min(100, Math.round((stats.weekTrainedDays / stats.weekElapsedDays) * 100))}%` }} />
              </div>
            </section>

            <section className="border-2 border-border p-4">
              <h2 className="font-heading uppercase tracking-wide text-sm text-ink/60 mb-3">{t("exercise.weeklyChart")}</h2>
              <div className="flex items-end gap-1 h-32">
                {stats.weeklyChart.map((w) => (
                  <div
                    key={w.week}
                    className="flex-1 bg-primary"
                    style={{ height: `${(w.days / 7) * 100}%`, minHeight: w.days > 0 ? "2px" : "0px" }}
                    title={`${t("exercise.week")} ${w.week}: ${w.days}`}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add cliente/src/features/exercise/ExerciseHomeScreen.jsx
git commit -m "feat(exercise): add Home stats screen"
```

---

### Task 13: `ExerciseCalendarScreen`

**Files:**
- Create: `cliente/src/features/exercise/ExerciseCalendarScreen.jsx`

**Interfaces:**
- Consumes: `useExerciseScope` (Task 10), `AppHeader`/`Spinner`/`AuthImage` (existing).
- Produces: `<ExerciseCalendarScreen />` — consumed by Task 18 (router wiring, `calendar` child route).
  Navigates to `${linkBase}/:id` (produced by Task 15).

- [ ] **Step 1: Write the screen**

`cliente/src/features/exercise/ExerciseCalendarScreen.jsx`:

```jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { api } from "../../lib/api.js";
import { useExerciseScope } from "./useExerciseScope.js";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfDayISO(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString(); }
function endOfDayISO(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x.toISOString(); }
function dayKey(iso) { return new Date(iso).toLocaleDateString("en-CA"); }

// Month grid starting on Monday, matching the mockup's default weekStartsOn=1.
function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  const dow = (firstDay.getDay() + 6) % 7;
  startDate.setDate(startDate.getDate() - dow);
  const weeksNeeded = Math.ceil((dow + lastDay.getDate()) / 7);
  const days = [];
  const cur = new Date(startDate);
  for (let i = 0; i < weeksNeeded * 7; i++) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return days;
}

export function ExerciseCalendarScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isCoach, apiBase, linkBase } = useExerciseScope();
  const [monthDate, setMonthDate] = useState(new Date());
  const [entries, setEntries] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const calendarDays = useMemo(() => getCalendarDays(monthDate), [monthDate]);

  useEffect(() => {
    const from = calendarDays[0];
    const to = calendarDays[calendarDays.length - 1];
    setEntries(null);
    api.get(apiBase, { from: startOfDayISO(from), to: endOfDayISO(to) }).then(setEntries).catch(() => setEntries([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, monthDate]);

  const entriesByDay = useMemo(() => {
    const map = {};
    for (const e of entries ?? []) {
      const k = dayKey(e.exercisedAt);
      (map[k] ??= []).push(e);
    }
    return map;
  }, [entries]);

  function navigateMonth(delta) {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + delta);
    setMonthDate(d);
    setSelectedDay(null);
  }

  const selectedKey = selectedDay ? selectedDay.toLocaleDateString("en-CA") : null;
  const selectedEntries = selectedKey ? (entriesByDay[selectedKey] ?? []) : [];

  return (
    <>
      <AppHeader title={t("exercise.calendar").toUpperCase()} showBack={isCoach} backTo={isCoach ? "/coach" : null} />
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b-2 border-border">
          <button onClick={() => navigateMonth(-1)} aria-label={t("common.back")} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-heading uppercase tracking-wide text-lg">{MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}</h2>
          <button onClick={() => navigateMonth(1)} aria-label={t("exercise.nextMonth")} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b-2 border-border">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_NAMES.map((d) => <div key={d} className="text-center text-xs font-heading uppercase text-ink/50">{d}</div>)}
          </div>
          {entries === null ? <Spinner /> : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, i) => {
                const isCurrentMonth = date.getMonth() === monthDate.getMonth();
                const key = date.toLocaleDateString("en-CA");
                const hasEntries = Boolean(entriesByDay[key]?.length);
                const isSelected = selectedKey === key;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(date)}
                    className={`aspect-square flex items-center justify-center text-sm border-2 ${isCurrentMonth ? "text-ink" : "text-ink/30 border-transparent"} ${isSelected ? "border-primary" : hasEntries ? "border-ink bg-ink text-white" : "border-transparent"}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {!selectedDay ? (
            <p className="text-ink/50 text-sm text-center py-8">{t("exercise.selectDay")}</p>
          ) : selectedEntries.length === 0 ? (
            <p className="text-ink/50 text-sm text-center py-8">{t("exercise.noEntriesDay")}</p>
          ) : (
            selectedEntries.map((entry) => (
              <button key={entry.id} onClick={() => navigate(`${linkBase}/${entry.id}`)} className="w-full text-left bg-white border-2 border-border p-3 hover:border-primary">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <span key={tag.id} className={`px-2 py-0.5 text-xs text-white bg-${tag.color}`}>{tag.name}</span>
                    ))}
                  </div>
                  <span className="text-xs text-ink/50 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(entry.exercisedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {entry.photos[0] && <AuthImage path={`/photos/${entry.photos[0].thumbKey}`} className="w-16 h-16 object-cover border-2 border-border mb-2" />}
                <p className="text-sm">{entry.description}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add cliente/src/features/exercise/ExerciseCalendarScreen.jsx
git commit -m "feat(exercise): add Calendar screen"
```

---

### Task 14: `ExerciseAddScreen`

**Files:**
- Create: `cliente/src/features/exercise/ExerciseAddScreen.jsx`

**Interfaces:**
- Consumes: `useExerciseScope` (Task 10), `compressImages` (existing `lib/imageCompress.js`),
  `AppHeader`/`Button` (existing), `api` (existing, `GET /exercise-tags`).
- Produces: `<ExerciseAddScreen />` — consumed by Task 18 (router wiring, client-only `add` route).

- [ ] **Step 1: Write the screen**

`cliente/src/features/exercise/ExerciseAddScreen.jsx`:

```jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, X } from "lucide-react";
import { api } from "../../lib/api.js";
import { compressImages } from "../../lib/imageCompress.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Button } from "../../components/Button.jsx";
import { useExerciseScope } from "./useExerciseScope.js";

const MAX_PHOTOS = 5;

function today() { return new Date().toLocaleDateString("en-CA"); }
function now() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }); }

export function ExerciseAddScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiBase, linkBase } = useExerciseScope();
  const [tags, setTags] = useState(null);
  const [files, setFiles] = useState([]);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(now());
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [description, setDescription] = useState("");
  const [biofeedback, setBiofeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => { api.get("/exercise-tags").then(setTags).catch(() => setTags([])); }, []);

  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));
  const canSave = selectedTagIds.length > 0 && description.trim() && !saving && !compressing;

  function toggleTag(id) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onFilesPicked(fileList) {
    setCompressing(true);
    try {
      const compressed = await compressImages(Array.from(fileList));
      setFiles((prev) => [...prev, ...compressed].slice(0, MAX_PHOTOS));
    } finally {
      setCompressing(false);
    }
  }

  async function onSave() {
    setSaving(true);
    const form = new FormData();
    selectedTagIds.forEach((id) => form.append("tagIds", id));
    form.append("exercisedAt", new Date(`${date}T${time}:00`).toISOString());
    form.append("description", description.trim());
    if (biofeedback.trim()) form.append("biofeedback", biofeedback.trim());
    files.forEach((f) => form.append("photos", f));
    try { await api.postForm(apiBase, form); navigate(linkBase); }
    finally { setSaving(false); }
  }

  return (
    <>
      <AppHeader title={t("exercise.addEntry").toUpperCase()} showBack backTo={linkBase} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.photos")} <span className="text-ink/40">{t("exercise.maxPhotos")}</span></h3>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p.url} alt="" className="w-full h-24 object-cover border-2 border-border" />
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="remove" className="absolute top-1 right-1 bg-danger text-white p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {files.length < MAX_PHOTOS && (
            <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed border-ink/40 text-ink/60 ${compressing ? "opacity-50" : "cursor-pointer"}`}>
              <Camera className="w-7 h-7 mb-1" />
              <span className="font-heading uppercase text-sm">{compressing ? t("exercise.processingPhotos") : t("exercise.addPhotos")}</span>
              <input type="file" accept="image/*" multiple className="hidden" disabled={compressing} onChange={(e) => onFilesPicked(e.target.files)} />
            </label>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.tags")} <span className="text-danger">*</span></h3>
          {tags === null ? <p className="text-sm text-ink/50">{t("common.loading")}</p> : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-2 text-sm font-heading uppercase tracking-wide border-2 ${selectedTagIds.includes(tag.id) ? `bg-${tag.color} text-white border-transparent` : "bg-white text-ink border-ink"}`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.date")}</h3>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.time")}</h3>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.description")} <span className="text-danger">*</span></h3>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder={t("exercise.descriptionHint")}
            className="w-full p-3 border-2 border-border rounded-none resize-none" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.biofeedback")}</h3>
          <textarea value={biofeedback} onChange={(e) => setBiofeedback(e.target.value)} rows={3}
            placeholder={t("exercise.biofeedbackHint")}
            className="w-full p-3 border-2 border-border rounded-none resize-none" />
        </section>
      </div>

      <div className="sticky bottom-0 z-30 bg-white p-4 border-t-2 border-border">
        <Button variant="primary" className="w-full" disabled={!canSave} onClick={onSave}>{t("exercise.save")}</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add cliente/src/features/exercise/ExerciseAddScreen.jsx
git commit -m "feat(exercise): add entry creation screen"
```

---

### Task 15: `ExerciseEntryDetailScreen` + `ExerciseEditEntryScreen`

**Files:**
- Create: `cliente/src/features/exercise/ExerciseEntryDetailScreen.jsx`
- Create: `cliente/src/features/exercise/ExerciseEditEntryScreen.jsx`

**Interfaces:**
- Consumes: `useExerciseScope` (Task 10), `AppHeader`/`Spinner`/`Button`/`AuthImage`/`PhotoCarousel`
  (existing).
- Produces: `<ExerciseEntryDetailScreen />`, `<ExerciseEditEntryScreen />` — consumed by Task 18
  (router wiring, `:id` and `:id/edit` routes).

- [ ] **Step 1: Write the detail screen**

`cliente/src/features/exercise/ExerciseEntryDetailScreen.jsx`:

```jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";
import { PhotoCarousel } from "../../components/PhotoCarousel.jsx";
import { useExerciseScope } from "./useExerciseScope.js";

export function ExerciseEntryDetailScreen() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isCoach, apiBase, linkBase } = useExerciseScope();
  const [entry, setEntry] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The only way into this screen is via Calendar (Journal was dropped) — back
  // always returns there, for both the client and the coach's read-only view.
  const backTo = `${linkBase}/calendar`;

  useEffect(() => { api.get(`${apiBase}/${id}`).then(setEntry).catch(() => setEntry(false)); }, [apiBase, id]);

  async function onDelete() {
    setDeleting(true);
    try { await api.del(`${apiBase}/${id}`); navigate(backTo); }
    finally { setDeleting(false); }
  }

  const editAction = !isCoach ? (
    <button onClick={() => navigate(`${linkBase}/${id}/edit`)} className="bg-primary text-white font-heading uppercase tracking-wide text-sm px-4 min-h-[40px] rounded-full">
      {t("exercise.edit")}
    </button>
  ) : null;

  if (entry === null) return (<><AppHeader title={t("exercise.detail").toUpperCase()} showBack backTo={backTo} /><Spinner /></>);
  if (entry === false) return (<><AppHeader title={t("exercise.detail").toUpperCase()} showBack backTo={backTo} /><p className="p-8 text-center text-ink/50">{t("exercise.noEntries")}</p></>);

  const date = new Date(entry.exercisedAt).toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = new Date(entry.exercisedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <AppHeader title={t("exercise.detail").toUpperCase()} showBack backTo={backTo} action={editAction} />
      <div className="flex-1 overflow-y-auto">
        <PhotoCarousel photos={entry.photos} />
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <span key={tag.id} className={`px-2 py-1 text-xs text-white bg-${tag.color}`}>{tag.name}</span>
            ))}
          </div>
          <div>
            <p className="text-ink/60 capitalize">{date}</p>
            <p className="text-ink/60 text-sm">{time}</p>
          </div>
          <section className="border-2 border-border p-3">
            <h3 className="font-heading uppercase tracking-wide text-sm mb-1">{t("exercise.description")}</h3>
            <p className="text-ink/80">{entry.description}</p>
          </section>
          {entry.biofeedback && (
            <section className="border-2 border-border p-3">
              <h3 className="font-heading uppercase tracking-wide text-sm mb-1">{t("exercise.biofeedback")}</h3>
              <p className="text-ink/80">{entry.biofeedback}</p>
            </section>
          )}
          {!isCoach && (
            <button onClick={() => setConfirming(true)} className="w-full min-h-[44px] px-4 font-heading uppercase tracking-wide border-2 border-danger text-danger flex items-center justify-center gap-2">
              <Trash2 className="w-5 h-5" />{t("exercise.delete")}
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label={t("common.cancel")} onClick={() => setConfirming(false)} className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white border-2 border-ink w-full max-w-sm p-4 space-y-4">
            <p className="font-medium">{t("exercise.deleteConfirm")}</p>
            <div className="flex gap-3">
              <Button variant="primary" className="flex-1 bg-danger border-danger" disabled={deleting} onClick={onDelete}>{t("exercise.delete")}</Button>
              <Button variant="secondary" className="flex-1" disabled={deleting} onClick={() => setConfirming(false)}>{t("common.cancel")}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Write the edit screen**

`cliente/src/features/exercise/ExerciseEditEntryScreen.jsx`:

```jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, X } from "lucide-react";
import { api } from "../../lib/api.js";
import { compressImages } from "../../lib/imageCompress.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { useExerciseScope } from "./useExerciseScope.js";

const MAX_PHOTOS = 5;

function timeOf(iso) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }); }
function dateOf(iso) { return new Date(iso).toLocaleDateString("en-CA"); }

export function ExerciseEditEntryScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiBase, linkBase } = useExerciseScope();
  const [entry, setEntry] = useState(null);
  const [tags, setTags] = useState(null);
  const [form, setForm] = useState(null);
  const [kept, setKept] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    api.get("/exercise-tags").then(setTags).catch(() => setTags([]));
    api.get(`${apiBase}/${id}`).then((e) => {
      setEntry(e);
      setKept(e.photos);
      setSelectedTagIds(e.tags.map((tg) => tg.id));
      setForm({ date: dateOf(e.exercisedAt), time: timeOf(e.exercisedAt), description: e.description, biofeedback: e.biofeedback ?? "" });
    }).catch(() => setEntry(false));
  }, [apiBase, id]);

  if (entry === null || !form || tags === null) return (<><AppHeader title={t("exercise.editEntry").toUpperCase()} showBack /><Spinner /></>);
  if (entry === false) return (<><AppHeader title={t("exercise.editEntry").toUpperCase()} showBack /><p className="p-8 text-center text-ink/50">{t("exercise.noEntries")}</p></>);

  function set(patch) { setForm((f) => ({ ...f, ...patch })); }
  function toggleTag(tagId) { setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((x) => x !== tagId) : [...prev, tagId])); }

  const newPreviews = newFiles.map((f) => ({ f, url: URL.createObjectURL(f) }));
  const total = kept.length + newFiles.length;
  const canSave = selectedTagIds.length > 0 && form.description.trim() && !saving && !compressing;

  async function onFilesPicked(fileList) {
    setCompressing(true);
    try {
      const compressed = await compressImages(Array.from(fileList));
      setNewFiles((prev) => [...prev, ...compressed].slice(0, MAX_PHOTOS - kept.length));
    } finally {
      setCompressing(false);
    }
  }

  async function onSave() {
    setSaving(true);
    const fd = new FormData();
    selectedTagIds.forEach((tid) => fd.append("tagIds", tid));
    fd.append("exercisedAt", new Date(`${form.date}T${form.time}:00`).toISOString());
    fd.append("description", form.description.trim());
    fd.append("biofeedback", form.biofeedback.trim());
    kept.forEach((p) => fd.append("keep", p.storageKey));
    newFiles.forEach((f) => fd.append("photos", f));
    try { await api.patchForm(`${apiBase}/${id}`, fd); navigate(`${linkBase}/${id}`); }
    finally { setSaving(false); }
  }

  return (
    <>
      <AppHeader title={t("exercise.editEntry").toUpperCase()} showBack />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.photos")} <span className="text-ink/40">{t("exercise.maxPhotos")}</span></h3>
          {total > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {kept.map((p) => (
                <div key={p.storageKey} className="relative">
                  <AuthImage path={`/photos/${p.thumbKey}`} className="w-full h-24 object-cover border-2 border-border" />
                  <button onClick={() => setKept(kept.filter((x) => x.storageKey !== p.storageKey))} aria-label="remove" className="absolute top-1 right-1 bg-danger text-white p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {newPreviews.map((p, i) => (
                <div key={`new-${i}`} className="relative">
                  <img src={p.url} alt="" className="w-full h-24 object-cover border-2 border-border" />
                  <button onClick={() => setNewFiles(newFiles.filter((_, j) => j !== i))} aria-label="remove" className="absolute top-1 right-1 bg-danger text-white p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {total < MAX_PHOTOS && (
            <label className={`flex flex-col items-center justify-center h-28 border-2 border-dashed border-ink/40 text-ink/60 ${compressing ? "opacity-50" : "cursor-pointer"}`}>
              <Camera className="w-7 h-7 mb-1" />
              <span className="font-heading uppercase text-sm">{compressing ? t("exercise.processingPhotos") : t("exercise.addPhotos")}</span>
              <input type="file" accept="image/*" multiple className="hidden" disabled={compressing} onChange={(e) => onFilesPicked(e.target.files)} />
            </label>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.tags")} <span className="text-danger">*</span></h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-2 text-sm font-heading uppercase tracking-wide border-2 ${selectedTagIds.includes(tag.id) ? `bg-${tag.color} text-white border-transparent` : "bg-white text-ink border-ink"}`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.date")}</h3>
          <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.time")}</h3>
          <input type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} className="w-full p-3 border-2 border-border rounded-none font-bold bg-white" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.description")}</h3>
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3} className="w-full p-3 border-2 border-border rounded-none resize-none" />
        </section>

        <section className="space-y-2">
          <h3 className="font-heading uppercase tracking-wide text-sm">{t("exercise.biofeedback")}</h3>
          <textarea value={form.biofeedback} onChange={(e) => set({ biofeedback: e.target.value })} rows={3} className="w-full p-3 border-2 border-border rounded-none resize-none" />
        </section>
      </div>

      <div className="sticky bottom-0 z-30 bg-white p-4 border-t-2 border-border flex gap-3">
        <Button variant="primary" className="flex-1" disabled={!canSave} onClick={onSave}>{t("exercise.saveChanges")}</Button>
        <Button variant="secondary" className="flex-1" onClick={() => navigate(`${linkBase}/${id}`)}>{t("common.cancel")}</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add cliente/src/features/exercise/ExerciseEntryDetailScreen.jsx cliente/src/features/exercise/ExerciseEditEntryScreen.jsx
git commit -m "feat(exercise): add entry detail and edit screens"
```

---

### Task 16: `ExerciseTagsScreen` (client, read-only)

**Files:**
- Create: `cliente/src/features/exercise/ExerciseTagsScreen.jsx`

**Interfaces:**
- Consumes: `useExerciseScope` (Task 10), `AppHeader`/`Spinner` (existing).
- Produces: `<ExerciseTagsScreen />` — consumed by Task 18 (router wiring, client-only `tags` route).

- [ ] **Step 1: Write the screen**

`cliente/src/features/exercise/ExerciseTagsScreen.jsx`:

```jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { api } from "../../lib/api.js";
import { useExerciseScope } from "./useExerciseScope.js";

// Read-only for clients — tags are created/deleted by a coach (see
// CoachTagsScreen.jsx under features/coach/).
export function ExerciseTagsScreen() {
  const { t } = useTranslation();
  const { isCoach } = useExerciseScope();
  const [tags, setTags] = useState(null);

  useEffect(() => { api.get("/exercise-tags").then(setTags).catch(() => setTags([])); }, []);

  return (
    <>
      <AppHeader title={t("exercise.tags").toUpperCase()} showBack={isCoach} backTo={isCoach ? "/coach" : null} />
      <div className="flex-1 overflow-y-auto p-4">
        {tags === null ? <Spinner /> : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-3 border-2 border-border p-3">
                <span className={`w-4 h-4 bg-${tag.color}`} />
                <span className="font-heading uppercase tracking-wide font-bold flex-1">{tag.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add cliente/src/features/exercise/ExerciseTagsScreen.jsx
git commit -m "feat(exercise): add read-only Tags screen for clients"
```

---

### Task 17: `CoachTagsScreen` + `CoachLayout` nav link

**Files:**
- Create: `cliente/src/features/coach/CoachTagsScreen.jsx`
- Modify: `cliente/src/features/coach/CoachLayout.jsx`

**Interfaces:**
- Consumes: `TAG_COLOR_PALETTE` (Task 8), `Button`/`Spinner` (existing), `api` (existing).
- Produces: `<CoachTagsScreen />` — consumed by Task 18 (router wiring, `/coach/tags`).

- [ ] **Step 1: Write the coach tags screen**

`cliente/src/features/coach/CoachTagsScreen.jsx`:

```jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { api } from "../../lib/api.js";
import { Button } from "../../components/Button.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { TAG_COLOR_PALETTE } from "../exercise/tagColors.js";

export function CoachTagsScreen() {
  const { t } = useTranslation();
  const [tags, setTags] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function load() { api.get("/exercise-tags").then(setTags).catch(() => setTags([])); }
  useEffect(() => { load(); }, []);

  async function onCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try { await api.post("/exercise-tags", { name: name.trim(), color }); setName(""); load(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function onDelete(id) {
    setError(null);
    try { await api.del(`/exercise-tags/${id}`); load(); }
    catch (err) { setError(err.message); }
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{t("exercise.manageTags")}</h1>

      <div className="border-2 border-border p-4 space-y-3">
        <h2 className="font-heading uppercase tracking-wide text-sm">{t("exercise.newTag")}</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("exercise.tagName")}
          className="w-full p-3 border-2 border-border rounded-none" />
        <div className="flex flex-wrap gap-2">
          {TAG_COLOR_PALETTE.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-8 h-8 bg-${c} ${color === c ? "ring-2 ring-offset-2 ring-ink" : ""}`} aria-label={c} />
          ))}
        </div>
        {error && <p role="alert" className="text-danger text-sm">{error}</p>}
        <Button variant="primary" className="w-full" disabled={!name.trim() || saving} onClick={onCreate}>{t("exercise.addTag")}</Button>
      </div>

      {tags === null ? <Spinner /> : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-3 border-2 border-border p-3">
              <span className={`w-4 h-4 bg-${tag.color}`} />
              <span className="font-heading uppercase tracking-wide font-bold flex-1">{tag.name}</span>
              {!tag.isSystem && (
                <button onClick={() => onDelete(tag.id)} aria-label={t("exercise.deleteTag")} className="text-danger p-2">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the nav link in `CoachLayout.jsx`**

In `cliente/src/features/coach/CoachLayout.jsx`, add a `Tag` icon import and a second `NavLink`:

```jsx
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth.jsx";
import { Users, Tag, LogOut } from "lucide-react";

export function CoachLayout() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[260px_1fr]">
      <aside className="bg-ink text-white md:min-h-dvh">
        <div className="p-4">
          <div className="font-heading font-bold tracking-wide text-lg">BLAZE LIFESTYLE</div>
          <div className="text-white/60 text-xs tracking-wide">COACH PANEL</div>
        </div>
        <nav className="flex md:block">
          <NavLink to="/coach" end className={({ isActive }) => `flex items-center gap-2 p-4 font-heading uppercase tracking-wide text-sm ${isActive ? "text-primary" : "text-white/70"}`}>
            <Users className="w-5 h-5" />{t("coach.clients")}
          </NavLink>
          <NavLink to="/coach/tags" className={({ isActive }) => `flex items-center gap-2 p-4 font-heading uppercase tracking-wide text-sm ${isActive ? "text-primary" : "text-white/70"}`}>
            <Tag className="w-5 h-5" />{t("exercise.manageTags")}
          </NavLink>
          <button onClick={logout} className="flex items-center gap-2 p-4 font-heading uppercase tracking-wide text-sm text-white/70">
            <LogOut className="w-5 h-5" />{t("auth.logout")}
          </button>
        </nav>
      </aside>
      <main className="bg-white"><Outlet /></main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add cliente/src/features/coach/CoachTagsScreen.jsx cliente/src/features/coach/CoachLayout.jsx
git commit -m "feat(exercise): add coach tag management screen and nav link"
```

---

### Task 18: Router wiring

**Files:**
- Modify: `cliente/src/app/router.jsx`
- Delete: `cliente/src/features/exercise/ExerciseScreen.jsx` (the placeholder from the prior
  increment — fully superseded by `ExerciseLayout` + its children)

**Interfaces:**
- Consumes: every component produced by Tasks 11–17.
- Produces: the fully wired `/exercise`, `/coach/clients/:clientId/exercise`, and `/coach/tags`
  route trees.

- [ ] **Step 1: Delete the placeholder screen**

```bash
git rm cliente/src/features/exercise/ExerciseScreen.jsx
```

- [ ] **Step 2: Rewrite the router**

`cliente/src/app/router.jsx`:

```jsx
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { LoginScreen } from "../features/auth/LoginScreen.jsx";
import { RegisterScreen } from "../features/auth/RegisterScreen.jsx";
import { CoachLayout } from "../features/coach/CoachLayout.jsx";
import { ClientSidebar } from "../components/ClientSidebar.jsx";
import { ModulePlaceholder } from "../features/modules/ModulePlaceholder.jsx";
import { NutritionLayout } from "../features/nutrition/NutritionLayout.jsx";
import { AddMealScreen } from "../features/nutrition/AddMealScreen.jsx";
import { EntryDetailScreen } from "../features/nutrition/EntryDetailScreen.jsx";
import { EditEntryScreen } from "../features/nutrition/EditEntryScreen.jsx";
import { ExerciseLayout } from "../features/exercise/ExerciseLayout.jsx";
import { ExerciseHomeScreen } from "../features/exercise/ExerciseHomeScreen.jsx";
import { ExerciseCalendarScreen } from "../features/exercise/ExerciseCalendarScreen.jsx";
import { ExerciseAddScreen } from "../features/exercise/ExerciseAddScreen.jsx";
import { ExerciseTagsScreen } from "../features/exercise/ExerciseTagsScreen.jsx";
import { ExerciseEntryDetailScreen } from "../features/exercise/ExerciseEntryDetailScreen.jsx";
import { ExerciseEditEntryScreen } from "../features/exercise/ExerciseEditEntryScreen.jsx";
import { ClientsScreen } from "../features/coach/ClientsScreen.jsx";
import { CoachTagsScreen } from "../features/coach/CoachTagsScreen.jsx";
import { CoachClientLayout } from "../features/coach/CoachClientLayout.jsx";
import { CoachClientHome } from "../features/coach/CoachClientHome.jsx";
import { SettingsScreen } from "../features/account/SettingsScreen.jsx";

function RequireRole({ role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "coach" ? "/coach" : "/nutrition"} replace />;
}

// Client shell. Mobile: centered column, navigation via the header hamburger.
// Desktop (lg+): persistent module sidebar on the left + content on the right.
function ClientShell() {
  return (
    <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[220px_1fr]">
      <ClientSidebar />
      <div className="min-w-0 flex flex-col min-h-dvh mx-auto w-full max-w-[480px] lg:max-w-none lg:mx-0">
        <Outlet />
      </div>
    </div>
  );
}

export const routes = [
  { path: "/login", element: <LoginScreen /> },
  { path: "/register", element: <RegisterScreen /> },
  { path: "/", element: <RoleHome /> },
  {
    element: <RequireRole role="client" />,
    children: [
      {
        element: <ClientShell />,
        children: [
          {
            path: "/nutrition",
            element: <NutritionLayout />,
            children: [
              { path: "add", element: <AddMealScreen /> },
              { path: ":id", element: <EntryDetailScreen /> },
              { path: ":id/edit", element: <EditEntryScreen /> },
            ],
          },
          {
            path: "/exercise",
            element: <ExerciseLayout />,
            children: [
              { index: true, element: <ExerciseHomeScreen /> },
              { path: "calendar", element: <ExerciseCalendarScreen /> },
              { path: "tags", element: <ExerciseTagsScreen /> },
              { path: "add", element: <ExerciseAddScreen /> },
              { path: ":id", element: <ExerciseEntryDetailScreen /> },
              { path: ":id/edit", element: <ExerciseEditEntryScreen /> },
            ],
          },
          { path: "/sleep", element: <ModulePlaceholder titleKey="module.sleep" /> },
          { path: "/body-comp", element: <ModulePlaceholder titleKey="module.bodyComp" /> },
          { path: "/settings", element: <SettingsScreen /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="coach" />,
    children: [
      {
        element: <CoachLayout />,
        children: [
          { path: "/coach", element: <ClientsScreen /> },
          { path: "/coach/tags", element: <CoachTagsScreen /> },
        ],
      },
      // Coach reviewing one client. Desktop shows [module sidebar · list ·
      // detail] in one view (CoachClientLayout mirrors the client's ClientShell);
      // entering a client lands straight on nutrition, no separate module step.
      {
        path: "/coach/clients/:clientId",
        element: <CoachClientLayout />,
        children: [
          { index: true, element: <CoachClientHome /> },
          {
            path: "nutrition",
            element: <NutritionLayout />,
            children: [
              { path: "add", element: <AddMealScreen /> },
              { path: ":id", element: <EntryDetailScreen /> },
              { path: ":id/edit", element: <EditEntryScreen /> },
            ],
          },
          {
            path: "exercise",
            element: <ExerciseLayout />,
            children: [
              { index: true, element: <ExerciseHomeScreen /> },
              { path: "calendar", element: <ExerciseCalendarScreen /> },
              { path: ":id", element: <ExerciseEntryDetailScreen /> },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
```

- [ ] **Step 3: Build the frontend**

Run (from `cliente/`): `npm run build`
Expected: build succeeds with no errors (this also validates JSX syntax across every file added in
Tasks 11–17, since the build compiles the whole app).

- [ ] **Step 4: Commit**

```bash
git add cliente/src/app/router.jsx
git commit -m "feat(exercise): wire up the full Exercise module routes"
```

---

### Task 19: End-to-end manual verification

**Files:** none (verification only).

- [ ] **Step 1: Start both servers**

```bash
npm run dev -w servidor    # or: cd servidor && npm run dev
npm run dev -w cliente     # or: cd cliente && npm run dev
```

(Adjust to however this repo's two standalone projects are normally started — see CLAUDE.md's
"Two standalone projects" note; there's no root workspace script, so run each `npm run dev` from
inside `servidor/` and `cliente/` respectively if the `-w` flag isn't wired up.)

- [ ] **Step 2: Client flow**

In the browser (client role, e.g. the `clienttest@example.com` account from Task 7's smoke test, or a
fresh registration):
1. Open the hamburger menu (mobile) or sidebar (desktop) → tap **Exercise**. Confirm the header reads
   "BLAZE LIFESTYLE / EXERCISE TRACKER" and the bottom tab bar shows Home / Calendar / Tags / Add.
2. Tap **Add** → select 1+ tags, add a photo, fill description, save. Confirm it redirects to Home.
3. Tap **Calendar** → confirm today's cell is highlighted as having an entry; tap it → confirm the
   entry card appears below with its tag, photo thumbnail, and description; tap the entry → confirm
   the detail screen shows the full photo carousel, tags, description, biofeedback, and an **Edit**
   button in the header plus a **Delete** button at the bottom.
4. Tap **Edit** → change the description → **Save changes** → confirm it returns to the detail screen
   with the new description.
5. Tap **Tags** → confirm it lists all 14 system tags (no add/delete controls visible).
6. Go back to Calendar → tap the same entry → **Delete** → confirm it disappears from Calendar.

- [ ] **Step 3: Coach flow**

Log in as the coach:
1. Sidebar → **Tags** (`/coach/tags`) → create a new custom tag with a name and color → confirm it
   appears in the list below with a delete icon; confirm the 14 system tags are listed without a
   delete icon.
2. Go to **Clients** → open the client used in Step 2 → on mobile, the module list should show
   **Exercise** as tappable (not "Coming soon"); on desktop, the left sidebar's Exercise link should
   be clickable.
3. Enter Exercise for that client → confirm the header shows a **back arrow** (to `/coach`), the
   bottom nav shows only **Home** and **Calendar** (no Tags/Add), and Home shows real stats matching
   what the client logged.
4. Go to Calendar → tap a day with an entry → tap the entry → confirm the detail screen shows the
   entry's photos/tags/description but **no Edit button and no Delete button**.
5. Confirm navigating directly to `.../exercise/add` or `.../exercise/tags` in the coach's per-client
   view isn't reachable through any UI control (no route registered for those under the coach branch).

- [ ] **Step 4: Tag deletion protection**

Back in `/coach/tags`, try deleting the custom tag created in Step 3.1 while it's still attached to
the client's entry — confirm it fails with a visible error message (the 409 from
`exerciseService.deleteTag`). Delete the entry first (as the client, or accept it'll stay pending),
then retry the tag deletion — confirm it now succeeds.

- [ ] **Step 5: Report results**

If every checkpoint above passes, the module is done. If something fails, note exactly which step and
what happened — that's the next task to fix before considering this plan complete.
