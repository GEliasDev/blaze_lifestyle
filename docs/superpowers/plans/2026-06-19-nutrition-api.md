# Nutrition API Implementation Plan (Plan A — backend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the backend for the nutrition loop: coach assigns a meal plan, client logs meals with photo evidence, coach reviews/comments/confirms compliance and sees metrics.

**Architecture:** New API modules following the established layering (model/schema/service/controller/route), built on the Foundation. Photo storage is pluggable (local disk in dev, R2 in prod). Authorization: route role guard + service-level ownership (client owns entry; coach owns client via `coach_clients`).

**Tech Stack:** JavaScript ESM, Express, Sequelize/PostgreSQL, Zod, multer, sharp, Vitest, Supertest.

## Global Constraints

- **JavaScript ESM only.** `.js`, explicit local import extensions. Module layering per `CLAUDE.md`.
- **No req/res in services.** Validate with Zod at the controller boundary.
- **Two-layer authz:** role guard on routes + ownership in services. Client may only touch own data; coach only clients linked via `coach_clients`.
- **Categories:** `Breakfast`, `AM Snack`, `Lunch`, `PM Snack`, `Dinner`, `Supplement`. **Compliance:** client `yes|no|na`, coach `yes|no`.
- **Effective compliance** = coach value if set, else client value; off-plan entries count `na`.
- **Photos:** private; served only via authenticated, ownership-checked `GET /api/photos/:key`. Storage is `apps/api/src/lib/storage.js` (disk when `R2_ENDPOINT` empty, else R2).
- **TDD:** failing test first for services/ownership/resolution logic. Integration tests against the real PostgreSQL DB; suites run serially (already configured).
- All new models use `underscored: true` and UUID ids like the existing ones.

---

## File Structure (new/changed)

```
apps/api/src/
├── lib/storage.js                         # MODIFY: add local-disk mode + getObject/deleteObject for disk
├── lib/ownership.js                        # NEW: assertCoachOwnsClient(coachId, clientId)
├── modules/mealplans/
│   ├── mealPlan.model.js                   # meal_plans
│   ├── mealPlanItem.model.js               # meal_plan_items
│   ├── mealplans.schema.js
│   ├── mealplans.service.js
│   ├── mealplans.controller.js
│   └── mealplans.route.js                  # coach + client routers
├── modules/nutrition/
│   ├── mealEntry.model.js                  # meal_entries
│   ├── mealPhoto.model.js                  # meal_photos
│   ├── nutrition.schema.js
│   ├── nutrition.service.js
│   ├── nutrition.controller.js             # multer upload + photo proxy
│   └── nutrition.route.js                  # client routers + photo proxy
├── modules/coaching/
│   ├── coachComment.model.js               # coach_comments
│   ├── coaching.schema.js
│   ├── coaching.service.js                 # clients list, comments, compliance, metrics, client entries
│   ├── coaching.controller.js
│   └── coaching.route.js                   # coach router
└── app.js                                  # MODIFY: mount the new routers (errorHandler stays LAST)
```

`apps/api/uploads/` is created at runtime by the disk storage adapter; add it to `.gitignore`.

---

### Task 1: Local-disk storage adapter

**Files:**
- Modify: `apps/api/src/lib/storage.js`
- Modify: `.gitignore` (add `uploads/`)
- Test: `apps/api/tests/storage-disk.test.js`

**Interfaces:**
- Produces (unchanged signatures): `buildKey(prefix, ext)`, `makeThumbnail(buffer)`, `putObject(key, body, contentType)`, `getObject(key) -> { body, contentType }`, `deleteObject(key)`. New behavior: when `config.r2.endpoint` is empty, all object ops use the local `uploads/` dir; `getObject` returns a readable stream + a content type inferred from the key extension.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/storage-disk.test.js`:
```js
import { describe, it, expect } from "vitest";
import { buildKey, putObject, getObject, deleteObject } from "../src/lib/storage.js";

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

describe("disk storage (R2_ENDPOINT empty)", () => {
  it("round-trips an object and deletes it", async () => {
    const key = buildKey("test", "txt");
    await putObject(key, Buffer.from("hello blaze"), "text/plain");
    const got = await getObject(key);
    expect((await streamToBuffer(got.body)).toString()).toBe("hello blaze");
    await deleteObject(key);
    await expect(getObject(key)).rejects.toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/api -- storage-disk`
Expected: FAIL (disk mode not implemented / file missing).

- [ ] **Step 3: Rewrite `apps/api/src/lib/storage.js`**

```js
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config.js";

const DISK = !config.r2.endpoint;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

const CONTENT_TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", txt: "text/plain" };
const contentTypeFor = (key) => CONTENT_TYPES[key.split(".").pop().toLowerCase()] ?? "application/octet-stream";

let client = null;
function r2() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: config.r2.endpoint,
      credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
    });
  }
  return client;
}

export const buildKey = (prefix, ext) => `${prefix}/${randomUUID()}.${ext}`;

export const makeThumbnail = (buffer) =>
  sharp(buffer).resize(320, 320, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();

export async function putObject(key, body, contentType) {
  if (DISK) {
    const full = path.join(UPLOADS_DIR, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    return;
  }
  await r2().send(new PutObjectCommand({ Bucket: config.r2.bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key) {
  if (DISK) {
    const full = path.join(UPLOADS_DIR, key);
    const { access } = await import("node:fs/promises");
    await access(full); // throws if missing
    return { body: createReadStream(full), contentType: contentTypeFor(key) };
  }
  const out = await r2().send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }));
  return { body: out.Body, contentType: out.ContentType };
}

export async function deleteObject(key) {
  if (DISK) {
    try { await unlink(path.join(UPLOADS_DIR, key)); } catch (err) { if (err.code !== "ENOENT") throw err; }
    return;
  }
  await r2().send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
}
```

- [ ] **Step 4: Add `uploads/` to `.gitignore`**

Append a line `uploads/` to the root `.gitignore`.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -w @blaze/api -- storage` (runs both storage suites)
Expected: PASS (existing storage.test.js + new storage-disk.test.js).

```bash
git add -A
git commit -m "feat(api): local-disk storage adapter (dev) alongside R2"
```

---

### Task 2: Ownership helper + meal plans module

**Files:**
- Create: `apps/api/src/lib/ownership.js`, `apps/api/src/modules/mealplans/{mealPlan.model,mealPlanItem.model,mealplans.schema,mealplans.service,mealplans.controller,mealplans.route}.js`
- Modify: `apps/api/src/app.js`
- Test: `apps/api/tests/mealplans.test.js`

**Interfaces:**
- `assertCoachOwnsClient(coachId, clientId)` → throws `HttpError(403)` unless a `coach_clients` row links them.
- `MealPlanModel` (meal_plans): `id, coachId, clientId, name, startDate, active`. `MealPlanItemModel` (meal_plan_items): `id, planId, category, title, notes, dayOfWeek, specificDate`.
- `mealplansService`: `getActivePlan(clientId)`, `createPlan(coachId, clientId, {name, startDate})` (deactivates prior active), `addItem(coachId, planId, data)`, `updateItem(coachId, itemId, data)`, `deleteItem(coachId, itemId)`, `resolveForDate(clientId, dateStr)`.
- Coach routes (mounted at `/api/coach`): `GET /clients/:clientId/plan`, `POST /clients/:clientId/plan`, `POST /plans/:planId/items`, `PATCH /plan-items/:itemId`, `DELETE /plan-items/:itemId`. Client routes (mounted at `/api/me`): `GET /plan`, `GET /plan/today?date=YYYY-MM-DD`.

- [ ] **Step 1: Create `lib/ownership.js`**

```js
import { CoachClientModel } from "../modules/coaching/coachClients.model.js";
import { HttpError } from "../middleware/error.js";

export async function assertCoachOwnsClient(coachId, clientId) {
  const link = await CoachClientModel.findOne({ where: { coachId, clientId } });
  if (!link) throw new HttpError(403, "Not your client");
}
```

- [ ] **Step 2: Create the two models**

`mealplans/mealPlan.model.js`:
```js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class MealPlanModel extends Model {}

MealPlanModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    coachId: { type: DataTypes.UUID, allowNull: false },
    clientId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: "meal_plans", underscored: true },
);
```

`mealplans/mealPlanItem.model.js`:
```js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class MealPlanItemModel extends Model {}

MealPlanItemModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    planId: { type: DataTypes.UUID, allowNull: false },
    category: { type: DataTypes.ENUM("Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"), allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    dayOfWeek: { type: DataTypes.SMALLINT, allowNull: true },   // 0=Sun..6=Sat
    specificDate: { type: DataTypes.DATEONLY, allowNull: true },
  },
  { sequelize, tableName: "meal_plan_items", underscored: true },
);
```

- [ ] **Step 3: Create `mealplans.schema.js`**

```js
import { z } from "zod";

const CATEGORY = z.enum(["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"]);

export const createPlanSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const planItemSchema = z.object({
  category: CATEGORY,
  title: z.string().min(1),
  notes: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (d) => (d.dayOfWeek === undefined) !== (d.specificDate === undefined),
  { message: "Provide exactly one of dayOfWeek or specificDate" },
);
```

- [ ] **Step 4: Write the failing test**

`apps/api/tests/mealplans.test.js`:
```js
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";
import { seedCoach } from "../src/db/seed.js";
import { signAccess } from "../src/lib/jwt.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { CoachClientModel } from "../src/modules/coaching/coachClients.model.js";
import { hashPassword } from "../src/lib/password.js";

let app, coachToken, clientToken, clientId;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  app = createApp();
  const coach = await seedCoach();
  coachToken = signAccess({ sub: coach.id, role: "coach" });
  const client = await UserModel.create({ role: "client", email: "c1@x.com", name: "C1", passwordHash: await hashPassword("secret12") });
  clientId = client.id;
  clientToken = signAccess({ sub: client.id, role: "client" });
  await CoachClientModel.create({ coachId: coach.id, clientId: client.id });
});

describe("meal plans", () => {
  it("coach creates a plan with weekly + dated items, client resolves today", async () => {
    const plan = await request(app).post(`/api/coach/clients/${clientId}/plan`)
      .set("Authorization", `Bearer ${coachToken}`).send({ name: "Plan Jun", startDate: "2026-06-01" });
    expect(plan.status).toBe(201);
    const planId = plan.body.id;

    // Weekly Monday breakfast (2026-06-15 is a Monday → day_of_week 1)
    await request(app).post(`/api/coach/plans/${planId}/items`).set("Authorization", `Bearer ${coachToken}`)
      .send({ category: "Breakfast", title: "Avena", dayOfWeek: 1 });
    // Date-specific override for 2026-06-15 breakfast
    await request(app).post(`/api/coach/plans/${planId}/items`).set("Authorization", `Bearer ${coachToken}`)
      .send({ category: "Breakfast", title: "Huevos (especial)", specificDate: "2026-06-15" });

    const today = await request(app).get(`/api/me/plan/today?date=2026-06-15`).set("Authorization", `Bearer ${clientToken}`);
    expect(today.status).toBe(200);
    const breakfast = today.body.find((r) => r.category === "Breakfast");
    expect(breakfast.title).toBe("Huevos (especial)"); // date-specific overrides weekday
  });

  it("rejects a coach acting on a non-client", async () => {
    const other = await UserModel.create({ role: "client", email: "c2@x.com", name: "C2", passwordHash: await hashPassword("secret12") });
    const res = await request(app).post(`/api/coach/clients/${other.id}/plan`)
      .set("Authorization", `Bearer ${coachToken}`).send({ name: "X", startDate: "2026-06-01" });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 5: Run to verify failure**

Run: `npm test -w @blaze/api -- mealplans`
Expected: FAIL (routes missing → 404/500).

- [ ] **Step 6: Create `mealplans.service.js`**

```js
import { MealPlanModel } from "./mealPlan.model.js";
import { MealPlanItemModel } from "./mealPlanItem.model.js";
import { assertCoachOwnsClient } from "../../lib/ownership.js";
import { HttpError } from "../../middleware/error.js";

const CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];

async function loadItemForCoach(coachId, itemId) {
  const item = await MealPlanItemModel.findByPk(itemId);
  if (!item) throw new HttpError(404, "Item not found");
  const plan = await MealPlanModel.findByPk(item.planId);
  if (!plan) throw new HttpError(404, "Plan not found");
  await assertCoachOwnsClient(coachId, plan.clientId);
  return item;
}

export const mealplansService = {
  async getActivePlan(clientId) {
    const plan = await MealPlanModel.findOne({ where: { clientId, active: true } });
    if (!plan) return null;
    const items = await MealPlanItemModel.findAll({ where: { planId: plan.id } });
    return { plan, items };
  },

  async createPlan(coachId, clientId, { name, startDate }) {
    await assertCoachOwnsClient(coachId, clientId);
    await MealPlanModel.update({ active: false }, { where: { clientId, active: true } });
    return MealPlanModel.create({ coachId, clientId, name, startDate, active: true });
  },

  async addItem(coachId, planId, data) {
    const plan = await MealPlanModel.findByPk(planId);
    if (!plan) throw new HttpError(404, "Plan not found");
    await assertCoachOwnsClient(coachId, plan.clientId);
    return MealPlanItemModel.create({ planId, ...data });
  },

  async updateItem(coachId, itemId, data) {
    const item = await loadItemForCoach(coachId, itemId);
    return item.update(data);
  },

  async deleteItem(coachId, itemId) {
    const item = await loadItemForCoach(coachId, itemId);
    await item.destroy();
  },

  // Returns one row per category for the given date, choosing a date-specific
  // item over the weekday item.
  async resolveForDate(clientId, dateStr) {
    const active = await this.getActivePlan(clientId);
    if (!active) return [];
    const dow = new Date(`${dateStr}T00:00:00`).getDay(); // 0=Sun..6=Sat
    return CATEGORIES.map((category) => {
      const items = active.items.filter((i) => i.category === category);
      const dated = items.find((i) => i.specificDate === dateStr);
      const weekly = items.find((i) => i.dayOfWeek === dow);
      const chosen = dated ?? weekly;
      return chosen ? { category, itemId: chosen.id, title: chosen.title, notes: chosen.notes } : null;
    }).filter(Boolean);
  },
};
```

- [ ] **Step 7: Create `mealplans.controller.js`**

```js
import { mealplansService } from "./mealplans.service.js";

export const mealplansController = {
  async createPlan(req, res, next) {
    try {
      const plan = await mealplansService.createPlan(req.user.sub, req.params.clientId, req.body);
      res.status(201).json({ id: plan.id, name: plan.name, startDate: plan.startDate, active: plan.active });
    } catch (err) { next(err); }
  },
  async getClientPlan(req, res, next) {
    try { res.json(await mealplansService.getActivePlan(req.params.clientId)); }
    catch (err) { next(err); }
  },
  async addItem(req, res, next) {
    try { res.status(201).json(await mealplansService.addItem(req.user.sub, req.params.planId, req.body)); }
    catch (err) { next(err); }
  },
  async updateItem(req, res, next) {
    try { res.json(await mealplansService.updateItem(req.user.sub, req.params.itemId, req.body)); }
    catch (err) { next(err); }
  },
  async deleteItem(req, res, next) {
    try { await mealplansService.deleteItem(req.user.sub, req.params.itemId); res.status(204).end(); }
    catch (err) { next(err); }
  },
  async myPlan(req, res, next) {
    try { res.json(await mealplansService.getActivePlan(req.user.sub)); }
    catch (err) { next(err); }
  },
  async myToday(req, res, next) {
    try { res.json(await mealplansService.resolveForDate(req.user.sub, req.query.date)); }
    catch (err) { next(err); }
  },
};
```

- [ ] **Step 8: Create `mealplans.route.js`**

```js
import { Router } from "express";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createPlanSchema, planItemSchema } from "./mealplans.schema.js";
import { mealplansController } from "./mealplans.controller.js";

export const coachPlansRouter = Router(); // mounted at /api/coach
coachPlansRouter.use(authGuard, roleGuard("coach"));
coachPlansRouter.get("/clients/:clientId/plan", mealplansController.getClientPlan);
coachPlansRouter.post("/clients/:clientId/plan", validate(createPlanSchema), mealplansController.createPlan);
coachPlansRouter.post("/plans/:planId/items", validate(planItemSchema), mealplansController.addItem);
coachPlansRouter.patch("/plan-items/:itemId", validate(planItemSchema), mealplansController.updateItem);
coachPlansRouter.delete("/plan-items/:itemId", mealplansController.deleteItem);

export const clientPlanRouter = Router(); // mounted at /api/me
clientPlanRouter.use(authGuard, roleGuard("client"));
clientPlanRouter.get("/plan", mealplansController.myPlan);
clientPlanRouter.get("/plan/today", mealplansController.myToday);
```

- [ ] **Step 9: Mount in `app.js`**

Add imports and mount BEFORE `app.use(errorHandler)`:
```js
import { coachPlansRouter, clientPlanRouter } from "./modules/mealplans/mealplans.route.js";
// ...
app.use("/api/coach", coachPlansRouter);
app.use("/api/me", clientPlanRouter);
```

- [ ] **Step 10: Run test and commit**

Run: `npm test -w @blaze/api -- mealplans`
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): meal plans module (assign, items, today-resolution, ownership)"
```

---

### Task 3: Nutrition module (entries + photo evidence)

**Files:**
- Create: `apps/api/src/modules/nutrition/{mealEntry.model,mealPhoto.model,nutrition.schema,nutrition.service,nutrition.controller,nutrition.route}.js`
- Modify: `apps/api/src/app.js`
- Test: `apps/api/tests/nutrition.test.js`

**Interfaces:**
- `MealEntryModel` (meal_entries): `id, clientId, planItemId, category, description, eatenAt, hasSymptoms, symptomDescription, clientCompliance, coachCompliance, coachComplianceAt`.
- `MealPhotoModel` (meal_photos): `id, entryId, storageKey, thumbKey, position`.
- `nutritionService`: `createEntry(clientId, data, files)`, `listEntries(clientId, filters)`, `getEntryForOwner(clientId, id)`, `updateEntry(clientId, id, data)`, `deleteEntry(clientId, id)`, `photoAccess(requester, key)` (returns the entry the photo belongs to, after checking the requester is the owning client or a coach who owns that client; throws 403/404 otherwise).
- Client routes (`/api/me`): `GET /entries`, `POST /entries` (multipart, field `photos`), `GET /entries/:id`, `PATCH /entries/:id`, `DELETE /entries/:id`. Photo proxy: `GET /api/photos/:prefix/:file` (auth + ownership).

- [ ] **Step 1: Create the two models**

`nutrition/mealEntry.model.js`:
```js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class MealEntryModel extends Model {}

MealEntryModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    clientId: { type: DataTypes.UUID, allowNull: false },
    planItemId: { type: DataTypes.UUID, allowNull: true },
    category: { type: DataTypes.ENUM("Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    eatenAt: { type: DataTypes.DATE, allowNull: false },
    hasSymptoms: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    symptomDescription: { type: DataTypes.TEXT, allowNull: true },
    clientCompliance: { type: DataTypes.ENUM("yes", "no", "na"), allowNull: false, defaultValue: "na" },
    coachCompliance: { type: DataTypes.ENUM("yes", "no"), allowNull: true },
    coachComplianceAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: "meal_entries", underscored: true },
);
```

`nutrition/mealPhoto.model.js`:
```js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class MealPhotoModel extends Model {}

MealPhotoModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    entryId: { type: DataTypes.UUID, allowNull: false },
    storageKey: { type: DataTypes.STRING, allowNull: false },
    thumbKey: { type: DataTypes.STRING, allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: "meal_photos", underscored: true },
);
```

- [ ] **Step 2: Create `nutrition.schema.js`**

```js
import { z } from "zod";

const CATEGORY = z.enum(["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"]);

// Multipart fields arrive as strings; coerce booleans.
export const createEntrySchema = z.object({
  category: CATEGORY,
  planItemId: z.string().uuid().optional(),
  description: z.string().optional(),
  eatenAt: z.string().min(1),
  hasSymptoms: z.coerce.boolean().optional(),
  symptomDescription: z.string().optional(),
  clientCompliance: z.enum(["yes", "no", "na"]).optional(),
});

export const updateEntrySchema = createEntrySchema.partial();
```

- [ ] **Step 3: Write the failing test**

`apps/api/tests/nutrition.test.js`:
```js
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";
import { signAccess } from "../src/lib/jwt.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { hashPassword } from "../src/lib/password.js";

let app, clientToken, otherToken;

async function jpeg() {
  return sharp({ create: { width: 64, height: 64, channels: 3, background: "green" } }).jpeg().toBuffer();
}

beforeAll(async () => {
  await sequelize.sync({ force: true });
  app = createApp();
  const client = await UserModel.create({ role: "client", email: "c1@x.com", name: "C1", passwordHash: await hashPassword("secret12") });
  clientToken = signAccess({ sub: client.id, role: "client" });
  const other = await UserModel.create({ role: "client", email: "c2@x.com", name: "C2", passwordHash: await hashPassword("secret12") });
  otherToken = signAccess({ sub: other.id, role: "client" });
});

describe("nutrition entries", () => {
  it("creates an entry with a photo, lists it, and serves the photo only to the owner", async () => {
    const create = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
      .field("category", "Breakfast").field("eatenAt", "2026-06-15T08:00:00.000Z")
      .field("clientCompliance", "yes").attach("photos", await jpeg(), "meal.jpg");
    expect(create.status).toBe(201);
    expect(create.body.photos.length).toBe(1);
    const photoKey = create.body.photos[0].thumbKey;

    const list = await request(app).get("/api/me/entries").set("Authorization", `Bearer ${clientToken}`);
    expect(list.body.length).toBe(1);

    const owner = await request(app).get(`/api/photos/${photoKey}`).set("Authorization", `Bearer ${clientToken}`);
    expect(owner.status).toBe(200);

    const intruder = await request(app).get(`/api/photos/${photoKey}`).set("Authorization", `Bearer ${otherToken}`);
    expect(intruder.status).toBe(403);
  });

  it("deletes an entry", async () => {
    const create = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
      .field("category", "Lunch").field("eatenAt", "2026-06-15T13:00:00.000Z").attach("photos", await jpeg(), "m.jpg");
    const del = await request(app).delete(`/api/me/entries/${create.body.id}`).set("Authorization", `Bearer ${clientToken}`);
    expect(del.status).toBe(204);
  });
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npm test -w @blaze/api -- nutrition`
Expected: FAIL (routes missing).

- [ ] **Step 5: Create `nutrition.service.js`**

```js
import { MealEntryModel } from "./mealEntry.model.js";
import { MealPhotoModel } from "./mealPhoto.model.js";
import { CoachClientModel } from "../coaching/coachClients.model.js";
import { buildKey, makeThumbnail, putObject, deleteObject } from "../../lib/storage.js";
import { HttpError } from "../../middleware/error.js";

function serialize(entry, photos) {
  return {
    id: entry.id, clientId: entry.clientId, planItemId: entry.planItemId, category: entry.category,
    description: entry.description, eatenAt: entry.eatenAt, hasSymptoms: entry.hasSymptoms,
    symptomDescription: entry.symptomDescription, clientCompliance: entry.clientCompliance,
    coachCompliance: entry.coachCompliance,
    photos: photos.map((p) => ({ storageKey: p.storageKey, thumbKey: p.thumbKey, position: p.position })),
  };
}

export const nutritionService = {
  async createEntry(clientId, data, files) {
    if (!files || files.length === 0) throw new HttpError(400, "At least one photo is required");
    const entry = await MealEntryModel.create({ clientId, ...data });
    const photos = [];
    for (let i = 0; i < files.length; i++) {
      const full = buildKey("meals", "jpg");
      const thumb = buildKey("thumbs", "jpg");
      await putObject(full, files[i].buffer, files[i].mimetype);
      await putObject(thumb, await makeThumbnail(files[i].buffer), "image/jpeg");
      photos.push(await MealPhotoModel.create({ entryId: entry.id, storageKey: full, thumbKey: thumb, position: i }));
    }
    return serialize(entry, photos);
  },

  async listEntries(clientId, filters = {}) {
    const where = { clientId };
    if (filters.category) where.category = filters.category;
    if (filters.hasSymptoms === "true") where.hasSymptoms = true;
    if (filters.clientCompliance) where.clientCompliance = filters.clientCompliance;
    const entries = await MealEntryModel.findAll({ where, order: [["eaten_at", "DESC"]] });
    const out = [];
    for (const e of entries) {
      const photos = await MealPhotoModel.findAll({ where: { entryId: e.id }, order: [["position", "ASC"]] });
      out.push(serialize(e, photos));
    }
    return out;
  },

  async getEntryForOwner(clientId, id) {
    const entry = await MealEntryModel.findByPk(id);
    if (!entry || entry.clientId !== clientId) throw new HttpError(404, "Entry not found");
    const photos = await MealPhotoModel.findAll({ where: { entryId: id }, order: [["position", "ASC"]] });
    return serialize(entry, photos);
  },

  async updateEntry(clientId, id, data) {
    const entry = await MealEntryModel.findByPk(id);
    if (!entry || entry.clientId !== clientId) throw new HttpError(404, "Entry not found");
    await entry.update(data);
    const photos = await MealPhotoModel.findAll({ where: { entryId: id }, order: [["position", "ASC"]] });
    return serialize(entry, photos);
  },

  async deleteEntry(clientId, id) {
    const entry = await MealEntryModel.findByPk(id);
    if (!entry || entry.clientId !== clientId) throw new HttpError(404, "Entry not found");
    const photos = await MealPhotoModel.findAll({ where: { entryId: id } });
    for (const p of photos) {
      await deleteObject(p.storageKey);
      await deleteObject(p.thumbKey);
      await p.destroy();
    }
    await entry.destroy();
  },

  // Returns the storage key if the requester may read it, else throws.
  async photoAccess(requester, key) {
    const photo = await MealPhotoModel.findOne({ where: { [key.startsWith("thumbs/") ? "thumbKey" : "storageKey"]: key } });
    if (!photo) throw new HttpError(404, "Photo not found");
    const entry = await MealEntryModel.findByPk(photo.entryId);
    if (!entry) throw new HttpError(404, "Photo not found");
    if (requester.role === "client") {
      if (entry.clientId !== requester.sub) throw new HttpError(403, "Forbidden");
    } else {
      const link = await CoachClientModel.findOne({ where: { coachId: requester.sub, clientId: entry.clientId } });
      if (!link) throw new HttpError(403, "Forbidden");
    }
    return key;
  },
};
```

- [ ] **Step 6: Create `nutrition.controller.js`**

```js
import { nutritionService } from "./nutrition.service.js";
import { getObject } from "../../lib/storage.js";

export const nutritionController = {
  async create(req, res, next) {
    try { res.status(201).json(await nutritionService.createEntry(req.user.sub, req.body, req.files)); }
    catch (err) { next(err); }
  },
  async list(req, res, next) {
    try { res.json(await nutritionService.listEntries(req.user.sub, req.query)); }
    catch (err) { next(err); }
  },
  async get(req, res, next) {
    try { res.json(await nutritionService.getEntryForOwner(req.user.sub, req.params.id)); }
    catch (err) { next(err); }
  },
  async update(req, res, next) {
    try { res.json(await nutritionService.updateEntry(req.user.sub, req.params.id, req.body)); }
    catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try { await nutritionService.deleteEntry(req.user.sub, req.params.id); res.status(204).end(); }
    catch (err) { next(err); }
  },
  async photo(req, res, next) {
    try {
      const key = `${req.params.prefix}/${req.params.file}`;
      await nutritionService.photoAccess(req.user, key);
      const { body, contentType } = await getObject(key);
      res.setHeader("Content-Type", contentType);
      body.pipe(res);
    } catch (err) { next(err); }
  },
};
```

- [ ] **Step 7: Create `nutrition.route.js`**

```js
import { Router } from "express";
import multer from "multer";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createEntrySchema, updateEntrySchema } from "./nutrition.schema.js";
import { nutritionController } from "./nutrition.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const clientEntriesRouter = Router(); // mounted at /api/me
clientEntriesRouter.use(authGuard, roleGuard("client"));
clientEntriesRouter.get("/entries", nutritionController.list);
clientEntriesRouter.post("/entries", upload.array("photos", 6), validate(createEntrySchema), nutritionController.create);
clientEntriesRouter.get("/entries/:id", nutritionController.get);
clientEntriesRouter.patch("/entries/:id", validate(updateEntrySchema), nutritionController.update);
clientEntriesRouter.delete("/entries/:id", nutritionController.remove);

// Photo proxy (both roles): mounted at /api/photos, key is "<prefix>/<file>"
export const photosRouter = Router();
photosRouter.use(authGuard);
photosRouter.get("/:prefix/:file", nutritionController.photo);
```

- [ ] **Step 8: Mount in `app.js`**

```js
import { clientEntriesRouter, photosRouter } from "./modules/nutrition/nutrition.route.js";
// before errorHandler:
app.use("/api/me", clientEntriesRouter);
app.use("/api/photos", photosRouter);
```

- [ ] **Step 9: Run test and commit**

Run: `npm test -w @blaze/api -- nutrition`
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): nutrition entries with photo evidence + ownership-checked photo proxy"
```

---

### Task 4: Coaching module (clients, comments, compliance, metrics)

**Files:**
- Create: `apps/api/src/modules/coaching/{coachComment.model,coaching.schema,coaching.service,coaching.controller,coaching.route}.js`
- Modify: `apps/api/src/app.js`; `apps/api/src/modules/nutrition/nutrition.service.js` (add `getEntryWithComments` used by client detail to include + mark coach comments read)
- Test: `apps/api/tests/coaching.test.js`

**Interfaces:**
- `CoachCommentModel` (coach_comments): `id, entryId, coachId, body, readByClientAt`.
- `coachingService`: `listClients(coachId)`, `getClientMetrics(coachId, clientId)`, `listClientEntries(coachId, clientId, filters)`, `getClientEntry(coachId, clientId, entryId)` (entry + photos + comments), `addComment(coachId, entryId, body)`, `confirmCompliance(coachId, entryId, value)`.
- Coach routes (`/api/coach`): `GET /clients`, `GET /clients/:clientId`, `GET /clients/:clientId/entries`, `GET /clients/:clientId/entries/:entryId`, `POST /entries/:entryId/comments`, `PATCH /entries/:entryId/compliance`.

- [ ] **Step 1: Create `coaching/coachComment.model.js`**

```js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class CoachCommentModel extends Model {}

CoachCommentModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    entryId: { type: DataTypes.UUID, allowNull: false },
    coachId: { type: DataTypes.UUID, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    readByClientAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: "coach_comments", underscored: true },
);
```

- [ ] **Step 2: Create `coaching/coaching.schema.js`**

```js
import { z } from "zod";
export const commentSchema = z.object({ body: z.string().min(1) });
export const complianceSchema = z.object({ coachCompliance: z.enum(["yes", "no"]) });
```

- [ ] **Step 3: Write the failing test**

`apps/api/tests/coaching.test.js`:
```js
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";
import { seedCoach } from "../src/db/seed.js";
import { signAccess } from "../src/lib/jwt.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { CoachClientModel } from "../src/modules/coaching/coachClients.model.js";
import { hashPassword } from "../src/lib/password.js";

let app, coachToken, clientToken, clientId, entryId;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  app = createApp();
  const coach = await seedCoach();
  coachToken = signAccess({ sub: coach.id, role: "coach" });
  const client = await UserModel.create({ role: "client", email: "c1@x.com", name: "C1", passwordHash: await hashPassword("secret12") });
  clientId = client.id;
  clientToken = signAccess({ sub: client.id, role: "client" });
  await CoachClientModel.create({ coachId: coach.id, clientId: client.id });
  const jpeg = await sharp({ create: { width: 32, height: 32, channels: 3, background: "red" } }).jpeg().toBuffer();
  const create = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
    .field("category", "Breakfast").field("eatenAt", "2026-06-15T08:00:00.000Z").field("clientCompliance", "no")
    .attach("photos", jpeg, "m.jpg");
  entryId = create.body.id;
});

describe("coaching", () => {
  it("lists clients, comments, confirms compliance, and computes metrics", async () => {
    const clients = await request(app).get("/api/coach/clients").set("Authorization", `Bearer ${coachToken}`);
    expect(clients.status).toBe(200);
    expect(clients.body.some((c) => c.id === clientId)).toBe(true);

    const comment = await request(app).post(`/api/coach/entries/${entryId}/comments`)
      .set("Authorization", `Bearer ${coachToken}`).send({ body: "Add more protein" });
    expect(comment.status).toBe(201);

    const conf = await request(app).patch(`/api/coach/entries/${entryId}/compliance`)
      .set("Authorization", `Bearer ${coachToken}`).send({ coachCompliance: "yes" });
    expect(conf.status).toBe(200);

    const metrics = await request(app).get(`/api/coach/clients/${clientId}`).set("Authorization", `Bearer ${coachToken}`);
    expect(metrics.body.metrics.totalEntries).toBe(1);

    // client sees the coach comment on the entry detail
    const detail = await request(app).get(`/api/me/entries/${entryId}`).set("Authorization", `Bearer ${clientToken}`);
    expect(detail.body.comments.length).toBe(1);
  });

  it("forbids commenting on a non-client's entry", async () => {
    const stranger = await UserModel.create({ role: "client", email: "s@x.com", name: "S", passwordHash: await hashPassword("secret12") });
    const strangerToken = signAccess({ sub: stranger.id, role: "client" });
    const jpeg = await sharp({ create: { width: 16, height: 16, channels: 3, background: "blue" } }).jpeg().toBuffer();
    const e = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${strangerToken}`)
      .field("category", "Lunch").field("eatenAt", "2026-06-15T13:00:00.000Z").attach("photos", jpeg, "m.jpg");
    const res = await request(app).post(`/api/coach/entries/${e.body.id}/comments`)
      .set("Authorization", `Bearer ${coachToken}`).send({ body: "x" });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npm test -w @blaze/api -- coaching`
Expected: FAIL (routes/service missing).

- [ ] **Step 5: Add `getEntryWithComments` to `nutrition.service.js`**

Append this method to the `nutritionService` object (it loads an owned entry, includes its coach comments, and marks unread comments as read by the client):
```js
  async getEntryWithComments(clientId, id) {
    const base = await this.getEntryForOwner(clientId, id);
    const { CoachCommentModel } = await import("../coaching/coachComment.model.js");
    const comments = await CoachCommentModel.findAll({ where: { entryId: id }, order: [["created_at", "ASC"]] });
    await CoachCommentModel.update({ readByClientAt: new Date() }, { where: { entryId: id, readByClientAt: null } });
    return { ...base, comments: comments.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt })) };
  },
```
Then change the client `GET /entries/:id` handler to use it: in `nutrition.controller.js`, update `get` to call `nutritionService.getEntryWithComments(req.user.sub, req.params.id)`.

- [ ] **Step 6: Create `coaching/coaching.service.js`**

```js
import { CoachClientModel } from "./coachClients.model.js";
import { CoachCommentModel } from "./coachComment.model.js";
import { UserModel } from "../users/users.model.js";
import { MealEntryModel } from "../nutrition/mealEntry.model.js";
import { MealPhotoModel } from "../nutrition/mealPhoto.model.js";
import { assertCoachOwnsClient } from "../../lib/ownership.js";
import { HttpError } from "../../middleware/error.js";

async function loadEntryForCoach(coachId, entryId) {
  const entry = await MealEntryModel.findByPk(entryId);
  if (!entry) throw new HttpError(404, "Entry not found");
  await assertCoachOwnsClient(coachId, entry.clientId);
  return entry;
}

function effective(entry) {
  if (entry.planItemId == null) return "na";
  return entry.coachCompliance ?? entry.clientCompliance;
}

export const coachingService = {
  async listClients(coachId) {
    const links = await CoachClientModel.findAll({ where: { coachId } });
    const out = [];
    for (const l of links) {
      const u = await UserModel.findByPk(l.clientId);
      if (!u) continue;
      const total = await MealEntryModel.count({ where: { clientId: u.id } });
      out.push({ id: u.id, name: u.name, email: u.email, totalEntries: total });
    }
    return out;
  },

  async getClientMetrics(coachId, clientId) {
    await assertCoachOwnsClient(coachId, clientId);
    const entries = await MealEntryModel.findAll({ where: { clientId } });
    const total = entries.length;
    const onPlan = entries.filter((e) => e.planItemId != null);
    const compliant = onPlan.filter((e) => effective(e) === "yes").length;
    const symptomDays = new Set(entries.filter((e) => e.hasSymptoms).map((e) => String(e.eatenAt).slice(0, 10))).size;
    const client = await UserModel.findByPk(clientId);
    return {
      id: client.id, name: client.name, email: client.email,
      metrics: {
        totalEntries: total,
        compliancePct: onPlan.length ? Math.round((compliant / onPlan.length) * 100) : null,
        symptomDays,
      },
    };
  },

  async listClientEntries(coachId, clientId, filters = {}) {
    await assertCoachOwnsClient(coachId, clientId);
    const where = { clientId };
    if (filters.category) where.category = filters.category;
    if (filters.hasSymptoms === "true") where.hasSymptoms = true;
    const entries = await MealEntryModel.findAll({ where, order: [["eaten_at", "DESC"]] });
    const out = [];
    for (const e of entries) {
      const photos = await MealPhotoModel.findAll({ where: { entryId: e.id }, order: [["position", "ASC"]] });
      out.push({
        id: e.id, category: e.category, description: e.description, eatenAt: e.eatenAt,
        hasSymptoms: e.hasSymptoms, clientCompliance: e.clientCompliance, coachCompliance: e.coachCompliance,
        photos: photos.map((p) => ({ thumbKey: p.thumbKey, storageKey: p.storageKey, position: p.position })),
      });
    }
    return out;
  },

  async getClientEntry(coachId, clientId, entryId) {
    await assertCoachOwnsClient(coachId, clientId);
    const entry = await MealEntryModel.findByPk(entryId);
    if (!entry || entry.clientId !== clientId) throw new HttpError(404, "Entry not found");
    const photos = await MealPhotoModel.findAll({ where: { entryId }, order: [["position", "ASC"]] });
    const comments = await CoachCommentModel.findAll({ where: { entryId }, order: [["created_at", "ASC"]] });
    return {
      id: entry.id, category: entry.category, description: entry.description, eatenAt: entry.eatenAt,
      hasSymptoms: entry.hasSymptoms, symptomDescription: entry.symptomDescription,
      clientCompliance: entry.clientCompliance, coachCompliance: entry.coachCompliance,
      photos: photos.map((p) => ({ thumbKey: p.thumbKey, storageKey: p.storageKey, position: p.position })),
      comments: comments.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt })),
    };
  },

  async addComment(coachId, entryId, body) {
    const entry = await loadEntryForCoach(coachId, entryId);
    return CoachCommentModel.create({ entryId: entry.id, coachId, body });
  },

  async confirmCompliance(coachId, entryId, value) {
    const entry = await loadEntryForCoach(coachId, entryId);
    return entry.update({ coachCompliance: value, coachComplianceAt: new Date() });
  },
};
```

- [ ] **Step 7: Create `coaching/coaching.controller.js`**

```js
import { coachingService } from "./coaching.service.js";

export const coachingController = {
  async listClients(req, res, next) {
    try { res.json(await coachingService.listClients(req.user.sub)); } catch (err) { next(err); }
  },
  async getClient(req, res, next) {
    try { res.json(await coachingService.getClientMetrics(req.user.sub, req.params.clientId)); } catch (err) { next(err); }
  },
  async clientEntries(req, res, next) {
    try { res.json(await coachingService.listClientEntries(req.user.sub, req.params.clientId, req.query)); } catch (err) { next(err); }
  },
  async clientEntry(req, res, next) {
    try { res.json(await coachingService.getClientEntry(req.user.sub, req.params.clientId, req.params.entryId)); } catch (err) { next(err); }
  },
  async addComment(req, res, next) {
    try {
      const c = await coachingService.addComment(req.user.sub, req.params.entryId, req.body.body);
      res.status(201).json({ id: c.id, body: c.body, createdAt: c.createdAt });
    } catch (err) { next(err); }
  },
  async confirmCompliance(req, res, next) {
    try {
      const e = await coachingService.confirmCompliance(req.user.sub, req.params.entryId, req.body.coachCompliance);
      res.json({ id: e.id, coachCompliance: e.coachCompliance });
    } catch (err) { next(err); }
  },
};
```

- [ ] **Step 8: Create `coaching/coaching.route.js`**

```js
import { Router } from "express";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { commentSchema, complianceSchema } from "./coaching.schema.js";
import { coachingController } from "./coaching.controller.js";

export const coachingRouter = Router(); // mounted at /api/coach
coachingRouter.use(authGuard, roleGuard("coach"));
coachingRouter.get("/clients", coachingController.listClients);
coachingRouter.get("/clients/:clientId", coachingController.getClient);
coachingRouter.get("/clients/:clientId/entries", coachingController.clientEntries);
coachingRouter.get("/clients/:clientId/entries/:entryId", coachingController.clientEntry);
coachingRouter.post("/entries/:entryId/comments", validate(commentSchema), coachingController.addComment);
coachingRouter.patch("/entries/:entryId/compliance", validate(complianceSchema), coachingController.confirmCompliance);
```

- [ ] **Step 9: Mount in `app.js`**

```js
import { coachingRouter } from "./modules/coaching/coaching.route.js";
// before errorHandler (after the other /api/coach routers is fine — Express matches by path):
app.use("/api/coach", coachingRouter);
```

- [ ] **Step 10: Run test and commit**

Run: `npm test -w @blaze/api -- coaching`
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): coaching module — clients, comments, compliance, metrics"
```

---

## Self-Review

- Storage now has a dev disk mode (Task 1) so photo upload works without R2 creds. ✓
- Meal plan: assign, weekly + dated items, today-resolution with date override, ownership (Task 2). ✓
- Nutrition entries with photo evidence, ownership-checked CRUD, private photo proxy (Task 3). ✓
- Coaching: clients list, comments (one-way, marked read on client detail), coach compliance confirmation, metrics with effective-compliance rule (Task 4). ✓
- Authorization in two layers (role guard on routers + `assertCoachOwnsClient` / clientId checks in services). ✓
- `errorHandler` stays last in `app.js` after every new mount. (Verify when editing.)
- Multipart booleans coerced via `z.coerce.boolean()`; `eatenAt` accepted as ISO string.
- **Next:** Plan B (frontend) consumes these endpoints: client timeline/add/detail/plan, coach clients/plan-editor/timeline/entry/metrics.
