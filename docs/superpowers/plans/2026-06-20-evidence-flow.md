# Plan-Driven Evidence-Only Logging Implementation Plan (Plan D)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the client log meals only as **photo evidence of an assigned plan item** (from "My Plan"), not free-form. The coach alone judges compliance. Remove the free-entry form.

**Architecture:** Backend — `POST /me/entries` requires `planItemId`, derives `category` from the item, and verifies the item belongs to the client's active plan; `/me/plan/today` reports which assigned meals are already evidenced; coach metrics become coach-review based. Frontend — "My Plan" becomes the action hub with an Upload-Evidence screen; the free Add screen, `/add` route, and bottom-nav "+" are removed.

**Tech Stack:** JavaScript ESM, Express, Sequelize/PostgreSQL, Zod, multer, sharp, React, Vite, Vitest, Supertest.

## Global Constraints

- **JavaScript ESM only** (`.js`/`.jsx`), explicit local import extensions, module layering, **no req/res in services**, Zod validation at the controller boundary.
- **Every meal entry is on-plan:** `planItemId` is required; the server derives `category` from the plan item and rejects an item that is not on the requesting client's **active** plan (403/404).
- **Compliance is coach-only:** the client never sends compliance; `client_compliance` stays `na`. `coach_compliance` (yes/no) is set only by the coach; null = **pending review**.
- Client logging entry point is **My Plan**; there is no free-form add. Bottom nav: **Diary · My plan · Settings**.
- Design tokens only; Lucide icons; i18n for all strings; touch targets ≥44px.
- **TDD:** failing test first for services/endpoints. API integration tests run serially against the real PostgreSQL DB.

---

### Task 1: Entry = evidence for an assigned plan item; coach-review metrics

**Files:**
- Modify: `apps/api/src/modules/nutrition/nutrition.schema.js` (createEntry requires planItemId; drop update schema), `nutrition.service.js` (createEntry derives category + ownership; drop updateEntry), `nutrition.controller.js` (drop update handler), `nutrition.route.js` (drop PATCH), `apps/api/src/modules/coaching/coaching.service.js` (metrics: compliancePct over reviewed + pendingReview)
- Modify (tests): `apps/api/tests/nutrition.test.js`, `apps/api/tests/coaching.test.js`

**Interfaces:**
- `POST /me/entries` body (multipart): `planItemId` (uuid, required), `eatenAt?`, `hasSymptoms?`, `symptomDescription?`, `photos` (1..n). Response entry carries `category` (derived) + `planItemId`.
- `coachingService.getClientMetrics` → `metrics: { totalEntries, compliancePct (over reviewed, null if none), pendingReview, symptomDays }`.

- [ ] **Step 1: Update `nutrition.schema.js`**

```js
import { z } from "zod";

export const createEntrySchema = z.object({
  planItemId: z.string().uuid(),
  eatenAt: z.string().min(1).optional(),
  hasSymptoms: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((v) => v === true || v === "true")
    .optional(),
  symptomDescription: z.string().optional(),
});
```
(Delete `updateEntrySchema` — client edit is removed.)

- [ ] **Step 2: Rewrite `nutrition.test.js`** (entries now require a plan item)

`apps/api/tests/nutrition.test.js`:
```js
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";
import { signAccess } from "../src/lib/jwt.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { CoachClientModel } from "../src/modules/coaching/coachClients.model.js";
import { MealPlanModel } from "../src/modules/mealplans/mealPlan.model.js";
import { MealPlanItemModel } from "../src/modules/mealplans/mealPlanItem.model.js";
import { hashPassword } from "../src/lib/password.js";

let app, clientToken, otherToken, planItemId, foreignItemId;
const jpeg = () => sharp({ create: { width: 64, height: 64, channels: 3, background: "green" } }).jpeg().toBuffer();

beforeAll(async () => {
  await sequelize.sync({ force: true });
  app = createApp();
  const coach = await UserModel.create({ role: "coach", email: "co@x.com", name: "Co", passwordHash: await hashPassword("secret12") });
  const client = await UserModel.create({ role: "client", email: "c1@x.com", name: "C1", passwordHash: await hashPassword("secret12") });
  const other = await UserModel.create({ role: "client", email: "c2@x.com", name: "C2", passwordHash: await hashPassword("secret12") });
  clientToken = signAccess({ sub: client.id, role: "client" });
  otherToken = signAccess({ sub: other.id, role: "client" });
  await CoachClientModel.create({ coachId: coach.id, clientId: client.id });
  const plan = await MealPlanModel.create({ coachId: coach.id, clientId: client.id, name: "P", startDate: "2026-06-01", active: true });
  const item = await MealPlanItemModel.create({ planId: plan.id, category: "Breakfast", title: "Avena", dayOfWeek: 1 });
  planItemId = item.id;
  // an item on a DIFFERENT client's plan (foreign)
  const otherPlan = await MealPlanModel.create({ coachId: coach.id, clientId: other.id, name: "P2", startDate: "2026-06-01", active: true });
  const otherItem = await MealPlanItemModel.create({ planId: otherPlan.id, category: "Lunch", title: "X", dayOfWeek: 1 });
  foreignItemId = otherItem.id;
});

describe("evidence entries", () => {
  it("logs evidence for an assigned plan item (category derived) + photo, serves photo to owner only", async () => {
    const res = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
      .field("planItemId", planItemId).field("eatenAt", "2026-06-15T08:00:00.000Z")
      .field("hasSymptoms", "false").attach("photos", await jpeg(), "m.jpg");
    expect(res.status).toBe(201);
    expect(res.body.category).toBe("Breakfast");
    expect(res.body.planItemId).toBe(planItemId);
    expect(res.body.photos.length).toBe(1);
    const key = res.body.photos[0].thumbKey;
    expect((await request(app).get(`/api/photos/${key}`).set("Authorization", `Bearer ${clientToken}`)).status).toBe(200);
    expect((await request(app).get(`/api/photos/${key}`).set("Authorization", `Bearer ${otherToken}`)).status).toBe(403);
  });

  it("rejects evidence for a plan item that is not on the client's active plan (403)", async () => {
    const res = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
      .field("planItemId", foreignItemId).attach("photos", await jpeg(), "m.jpg");
    expect(res.status).toBe(403);
  });

  it("rejects evidence with no photo (400)", async () => {
    const res = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
      .field("planItemId", planItemId);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -w @blaze/api -- nutrition`
Expected: FAIL (createEntry still expects the old shape / doesn't derive category).

- [ ] **Step 4: Rewrite `createEntry` in `nutrition.service.js`** (and remove `updateEntry`)

Add imports at the top:
```js
import { MealPlanItemModel } from "../mealplans/mealPlanItem.model.js";
import { MealPlanModel } from "../mealplans/mealPlan.model.js";
```
Replace `createEntry` with:
```js
  async createEntry(clientId, data, files) {
    if (!files || files.length === 0) throw new HttpError(400, "At least one photo is required");
    const item = await MealPlanItemModel.findByPk(data.planItemId);
    if (!item) throw new HttpError(404, "Plan item not found");
    const plan = await MealPlanModel.findByPk(item.planId);
    if (!plan || plan.clientId !== clientId || !plan.active) throw new HttpError(403, "Not your assigned meal");
    const entry = await MealEntryModel.create({
      clientId, planItemId: item.id, category: item.category,
      eatenAt: data.eatenAt ?? new Date(),
      hasSymptoms: data.hasSymptoms ?? false,
      symptomDescription: data.symptomDescription ?? null,
      clientCompliance: "na",
    });
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
```
Delete the `updateEntry` method.

- [ ] **Step 5: Drop the update handler/route**

In `nutrition.controller.js` delete the `update` handler. In `nutrition.route.js` remove the `clientEntriesRouter.patch("/entries/:id", ...)` line and drop `updateEntrySchema` from the imports (keep `createEntrySchema`).

- [ ] **Step 6: Update coach metrics** in `coaching.service.js`

Replace the body of `getClientMetrics` (keep the `assertCoachOwnsClient` call) and delete the now-unused `effective()` helper:
```js
  async getClientMetrics(coachId, clientId) {
    await assertCoachOwnsClient(coachId, clientId);
    const entries = await MealEntryModel.findAll({ where: { clientId } });
    const reviewed = entries.filter((e) => e.coachCompliance != null);
    const compliant = reviewed.filter((e) => e.coachCompliance === "yes").length;
    const symptomDays = new Set(
      entries.filter((e) => e.hasSymptoms).map((e) => new Date(e.eatenAt).toISOString().slice(0, 10)),
    ).size;
    const client = await UserModel.findByPk(clientId);
    return {
      id: client.id, name: client.name, email: client.email,
      metrics: {
        totalEntries: entries.length,
        compliancePct: reviewed.length ? Math.round((compliant / reviewed.length) * 100) : null,
        pendingReview: entries.length - reviewed.length,
        symptomDays,
      },
    };
  },
```

- [ ] **Step 7: Fix `coaching.test.js`** (entry creation + metric assertions)

In `apps/api/tests/coaching.test.js`, the `beforeAll` creates an entry via `POST /me/entries`. Update it to first create an active plan + item for the client and post evidence with `planItemId` (import `MealPlanModel`, `MealPlanItemModel`):
```js
const plan = await MealPlanModel.create({ coachId: coach.id, clientId: client.id, name: "P", startDate: "2026-06-01", active: true });
const item = await MealPlanItemModel.create({ planId: plan.id, category: "Breakfast", title: "Avena", dayOfWeek: 1 });
const create = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
  .field("planItemId", item.id).field("eatenAt", "2026-06-15T08:00:00.000Z")
  .attach("photos", jpeg, "m.jpg");
entryId = create.body.id;
```
Then in the metrics assertion of the first test, after the coach confirms compliance "yes", assert the new shape:
```js
const metrics = await request(app).get(`/api/coach/clients/${clientId}`).set("Authorization", `Bearer ${coachToken}`);
expect(metrics.body.metrics.totalEntries).toBe(1);
expect(metrics.body.metrics.compliancePct).toBe(100); // one reviewed entry, coach said yes
expect(metrics.body.metrics.pendingReview).toBe(0);
```
For the second test (coach comments on a stranger's entry → 403), that stranger's entry is also created via a plan item — give the stranger their own plan + item and post evidence with it (mirror the pattern). Keep the 403 assertion.

- [ ] **Step 8: Run tests and commit**

Run: `npm test -w @blaze/api -- nutrition coaching` then `npm test -w @blaze/api` (full).
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): meal entry is evidence for an assigned plan item; coach-review metrics"
```

---

### Task 2: today-logged status + assigned-meal title on coach entry

**Files:**
- Modify: `apps/api/src/modules/mealplans/mealplans.service.js` (`resolveForDate` adds `loggedEntryId`), `apps/api/src/modules/coaching/coaching.service.js` (`getClientEntry` adds `assignedTitle`)
- Modify (tests): `apps/api/tests/mealplans.test.js`, `apps/api/tests/coaching.test.js`

**Interfaces:**
- `GET /me/plan/today` rows: `{ category, itemId, title, notes, loggedEntryId }` (loggedEntryId = the client's entry evidencing that item that day, or null).
- `getClientEntry` response includes `assignedTitle` (the plan item's title, or null).

- [ ] **Step 1: Update `resolveForDate`** in `mealplans.service.js`

Add top imports:
```js
import { Op } from "sequelize";
import { MealEntryModel } from "../nutrition/mealEntry.model.js";
```
After building the `rows` array (the per-category resolved items) and before returning, attach the logged status:
```js
    const dayStart = new Date(`${dateStr}T00:00:00`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999`);
    for (const r of rows) {
      const entry = await MealEntryModel.findOne({
        where: { clientId, planItemId: r.itemId, eatenAt: { [Op.between]: [dayStart, dayEnd] } },
      });
      r.loggedEntryId = entry ? entry.id : null;
    }
    return rows;
```
(`rows` is the array currently returned by `resolveForDate`; assign it to a `const rows = CATEGORIES.map(...).filter(Boolean);` if it is presently returned inline, so the loop can mutate it before returning.)

- [ ] **Step 2: Update `getClientEntry`** in `coaching.service.js`

Import the plan item model at the top:
```js
import { MealPlanItemModel } from "../mealplans/mealPlanItem.model.js";
```
In `getClientEntry`, after loading the entry, look up the assigned title and include it in the returned object:
```js
    const item = entry.planItemId ? await MealPlanItemModel.findByPk(entry.planItemId) : null;
    // ...add to the returned object:
    assignedTitle: item ? item.title : null,
```

- [ ] **Step 3: Update the tests (write first, watch fail, then they pass after Steps 1–2)**

In `apps/api/tests/mealplans.test.js`, extend the first test: after the client resolves today's breakfast, log evidence for it and assert `loggedEntryId` flips from null to the entry id. Add (the test already has `clientToken` and the dated item "Huevos (especial)" for 2026-06-15; use that day):
```js
import sharp from "sharp";
// inside the "resolves today" test, after asserting the breakfast title:
const beforeLog = today.body.find((r) => r.category === "Breakfast");
expect(beforeLog.loggedEntryId).toBeNull();
const jpeg = await sharp({ create: { width: 16, height: 16, channels: 3, background: "red" } }).jpeg().toBuffer();
await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
  .field("planItemId", beforeLog.itemId).field("eatenAt", "2026-06-15T08:00:00.000Z")
  .attach("photos", jpeg, "m.jpg");
const after = await request(app).get(`/api/me/plan/today?date=2026-06-15`).set("Authorization", `Bearer ${clientToken}`);
expect(after.body.find((r) => r.category === "Breakfast").loggedEntryId).toBeTruthy();
```
In `apps/api/tests/coaching.test.js`, in the test that fetches the client entry detail (coach side), assert `assignedTitle` is present:
```js
const detail = await request(app).get(`/api/coach/clients/${clientId}/entries/${entryId}`).set("Authorization", `Bearer ${coachToken}`);
expect(detail.body.assignedTitle).toBe("Avena");
```
(If that coach-entry GET is not already in the test, add it.)

- [ ] **Step 4: Run tests and commit**

Run: `npm test -w @blaze/api -- mealplans coaching` then `npm test -w @blaze/api` (full).
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): today's logged-evidence status + assigned-meal title for coach"
```

---

### Task 3: Client — My Plan action hub + Upload-Evidence screen; remove free add

**Files:**
- Replace: `apps/web/src/features/nutrition/MyPlanScreen.jsx`
- Create: `apps/web/src/features/nutrition/EvidenceScreen.jsx`
- Delete: `apps/web/src/features/nutrition/AddEntryScreen.jsx`, `apps/web/src/features/nutrition/AddEntryScreen.test.jsx`
- Modify: `apps/web/src/app/router.jsx` (drop `/add`, add `/evidence/:itemId`), `apps/web/src/components/BottomNav.jsx` (Diary · My plan · Settings; no "+"), `apps/web/src/locales/es.json` + `en.json` (evidence strings)
- Test: `apps/web/src/features/nutrition/EvidenceScreen.test.jsx`

**Interfaces:**
- `MyPlanScreen`: today's meals each link to `/entry/:loggedEntryId` (uploaded) or `/evidence/:itemId` (pending, passing `{ category, title }` in router state).
- `EvidenceScreen`: shows the assigned meal read-only; photo input + optional symptoms; submits `api.postForm("/me/entries", form)` with `planItemId` then navigates to `/plan`.

- [ ] **Step 1: Add i18n strings**

Merge into `es.json` (English mirror into `en.json`):
```json
"evidence": { "title": "Subir evidencia", "assigned": "Comida asignada", "upload": "Subir evidencia", "pending": "Pendiente", "done": "Evidencia subida", "addPhotos": "Agregar foto(s)", "symptoms": "Tuve molestias digestivas", "symptomsDesc": "Describe los síntomas", "save": "Enviar evidencia", "viewEntry": "Ver evidencia" }
```
English: title "Upload evidence", assigned "Assigned meal", upload "Upload evidence", pending "Pending", done "Evidence uploaded", addPhotos "Add photo(s)", symptoms "I had digestive discomfort", symptomsDesc "Describe symptoms", save "Send evidence", viewEntry "View evidence".

- [ ] **Step 2: Replace `MyPlanScreen.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, Check } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function MyPlanScreen() {
  const { t } = useTranslation();
  const [plan, setPlan] = useState(undefined);
  const [today, setToday] = useState([]);
  useEffect(() => {
    const date = new Date().toISOString().slice(0, 10);
    api.get("/me/plan").then(setPlan).catch(() => setPlan(null));
    api.get("/me/plan/today", { date }).then(setToday).catch(() => setToday([]));
  }, []);
  if (plan === undefined) return (<><AppHeader title={t("plan.title").toUpperCase()} /><Spinner /></>);
  if (!plan) return (<><AppHeader title={t("plan.title").toUpperCase()} /><p className="p-8 text-center font-heading uppercase text-ink/50">{t("plan.none")}</p></>);

  return (
    <>
      <AppHeader title={t("plan.title").toUpperCase()} />
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <section>
          <h3 className="font-heading uppercase tracking-wide text-sm mb-2 text-primary">{t("plan.today")}</h3>
          <div className="space-y-2">
            {today.length === 0 && <p className="text-ink/50 text-sm">—</p>}
            {today.map((r) => (
              r.loggedEntryId ? (
                <Link key={r.itemId} to={`/entry/${r.loggedEntryId}`} className="flex items-center justify-between border-2 border-success p-3">
                  <div>
                    <div className="font-heading uppercase text-xs text-ink/60">{t(`category.${r.category}`)}</div>
                    <div className="font-medium">{r.title}</div>
                  </div>
                  <span className="flex items-center gap-1 text-success font-heading uppercase text-xs"><Check className="w-4 h-4" />{t("evidence.done")}</span>
                </Link>
              ) : (
                <Link key={r.itemId} to={`/evidence/${r.itemId}`} state={{ category: r.category, title: r.title }} className="flex items-center justify-between border-2 border-primary p-3">
                  <div>
                    <div className="font-heading uppercase text-xs text-ink/60">{t(`category.${r.category}`)}</div>
                    <div className="font-medium">{r.title}</div>
                  </div>
                  <span className="flex items-center gap-1 text-primary font-heading uppercase text-xs"><Camera className="w-4 h-4" />{t("evidence.upload")}</span>
                </Link>
              )
            ))}
          </div>
        </section>
        <section>
          <h3 className="font-heading uppercase tracking-wide text-sm mb-2">{t("plan.week")}</h3>
          <div className="space-y-2">
            {plan.items.filter((i) => i.dayOfWeek != null).sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((i) => (
              <div key={i.id} className="border-2 border-border p-3 flex justify-between">
                <span className="font-heading uppercase text-xs text-ink/60">{DAYS[i.dayOfWeek]} · {t(`category.${i.category}`)}</span>
                <span className="font-medium">{i.title}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Write the failing test**

`features/nutrition/EvidenceScreen.test.jsx`:
```jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({ api: { postForm: vi.fn().mockResolvedValue({ id: "e1" }) } }));
import { EvidenceScreen } from "./EvidenceScreen.jsx";

it("renders the assigned meal and a disabled save until a photo is added", () => {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/evidence/i1", state: { category: "Breakfast", title: "Avena" } }]}>
      <Routes><Route path="/evidence/:itemId" element={<EvidenceScreen />} /></Routes>
    </MemoryRouter>
  );
  expect(screen.getByText("Avena")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /enviar evidencia/i })).toBeDisabled();
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npm test -w @blaze/web -- EvidenceScreen`
Expected: FAIL (module missing).

- [ ] **Step 5: Create `EvidenceScreen.jsx`**

```jsx
import { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, X } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Button } from "../../components/Button.jsx";

export function EvidenceScreen() {
  const { itemId } = useParams();
  const { state } = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [hasSymptoms, setHasSymptoms] = useState(false);
  const [symptomDescription, setSymptomDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));

  async function onSave() {
    setSaving(true);
    const form = new FormData();
    form.append("planItemId", itemId);
    form.append("eatenAt", new Date().toISOString());
    form.append("hasSymptoms", String(hasSymptoms));
    if (hasSymptoms && symptomDescription) form.append("symptomDescription", symptomDescription);
    files.forEach((f) => form.append("photos", f));
    try { await api.postForm("/me/entries", form); navigate("/plan"); }
    finally { setSaving(false); }
  }

  return (
    <>
      <AppHeader title={t("evidence.title").toUpperCase()} showBack />
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="border-2 border-border p-3">
          <div className="font-heading uppercase text-xs text-ink/60">{t("evidence.assigned")}{state?.category ? ` · ${t(`category.${state.category}`)}` : ""}</div>
          <div className="font-bold text-lg">{state?.title ?? ""}</div>
        </div>
        <div className="space-y-2">
          <span className="font-heading uppercase tracking-wide text-sm">{t("evidence.addPhotos")}</span>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p.url} alt="" className="w-full h-24 object-cover border-2 border-border" />
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-danger text-white p-1" aria-label="remove"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
          <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-ink/40 cursor-pointer">
            <Camera className="w-7 h-7 mb-1" />
            <span className="font-heading uppercase text-sm">{t("evidence.addPhotos")}</span>
            <input type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hasSymptoms} onChange={(e) => setHasSymptoms(e.target.checked)} className="w-5 h-5" />
          <span className="font-medium">{t("evidence.symptoms")}</span>
        </label>
        {hasSymptoms && <textarea value={symptomDescription} onChange={(e) => setSymptomDescription(e.target.value)} rows={2} placeholder={t("evidence.symptomsDesc")} className="w-full p-3 border-2 border-danger rounded-none" />}
      </div>
      <div className="p-4 border-t-2 border-border">
        <Button variant="primary" className="w-full" disabled={files.length === 0 || saving} onClick={onSave}>{t("evidence.save")}</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Routing + bottom nav; delete the free add screen**

In `app/router.jsx`: remove the `AddEntryScreen` import and the `{ path: "/add", element: <AddEntryScreen /> }` route; add `import { EvidenceScreen } from "../features/nutrition/EvidenceScreen.jsx";` and `{ path: "/evidence/:itemId", element: <EvidenceScreen /> }` inside the client `ClientShell` children.
Delete files `AddEntryScreen.jsx` and `AddEntryScreen.test.jsx` (`git rm`).
In `components/BottomNav.jsx`: remove the `/add` (`Plus`) item so the nav is Diary (`/home`, `ClipboardList`), My plan (`/plan`, `CalendarDays`), Settings (`/settings`, `Settings`). Update imports (drop `Plus`).

- [ ] **Step 7: Run tests and commit**

Run: `npm test -w @blaze/web -- EvidenceScreen` then `npm test -w @blaze/web` (full — make sure the deleted AddEntry test is gone and nothing imports it).
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): My Plan action hub + upload-evidence screen; remove free-form add"
```

---

### Task 4: Coach-only compliance display (pending state) + assigned title

**Files:**
- Modify: `apps/web/src/components/ComplianceBadge.jsx` (add `pending`), `apps/web/src/locales/es.json` + `en.json` (compliance.pending), `apps/web/src/features/nutrition/TimelineScreen.jsx`, `apps/web/src/features/nutrition/EntryDetailScreen.jsx`, `apps/web/src/features/coach/ClientDetailScreen.jsx`, `apps/web/src/features/coach/CoachEntryScreen.jsx`
- Test: update `apps/web/src/components/ComplianceBadge.test.jsx` (a `pending` case)

**Interfaces:**
- `<ComplianceBadge value="pending" />` shows a neutral "Pending" badge (clock icon). Entry displays use `coachCompliance ?? "pending"` (the client no longer self-reports).

- [ ] **Step 1: Add `compliance.pending` i18n**

Add to `es.json` `compliance`: `"pending": "Pendiente"`; to `en.json`: `"pending": "Pending"`.

- [ ] **Step 2: Update `ComplianceBadge.jsx`**

Add a `pending` style (import `Clock` from lucide-react):
```jsx
import { Check, X, Minus, Clock } from "lucide-react";

const styles = {
  yes: { cls: "bg-success text-white border-success", Icon: Check },
  no: { cls: "bg-danger text-white border-danger", Icon: X },
  na: { cls: "bg-white text-ink border-ink", Icon: Minus },
  pending: { cls: "bg-muted text-ink/70 border-border", Icon: Clock },
};
```
(The component already does `styles[value] ?? styles.na` and `t(\`compliance.${value}\`)`, so `value="pending"` now renders with the "Pendiente" label.)

- [ ] **Step 3: Update the badge test**

In `ComplianceBadge.test.jsx`, add:
```jsx
it("shows a pending badge", () => {
  render(<ComplianceBadge value="pending" />);
  expect(screen.getByText(/pendiente/i)).toBeInTheDocument();
});
```

- [ ] **Step 4: Swap entry compliance displays to coach-or-pending**

In each of these, change `value={e.coachCompliance ?? e.clientCompliance}` (or the entry's equivalent) to `value={ENTRY.coachCompliance ?? "pending"}`:
- `TimelineScreen.jsx` (the card badge).
- `EntryDetailScreen.jsx` (the header badge).
- `ClientDetailScreen.jsx` (the entries-list badge).
- `CoachEntryScreen.jsx` (the header badge).

In `CoachEntryScreen.jsx` also show the assigned meal title near the category heading (the API now returns `assignedTitle`):
```jsx
{entry.assignedTitle && <p className="text-ink/60">{t("evidence.assigned")}: {entry.assignedTitle}</p>}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test -w @blaze/web` (full).
Expected: PASS (component tests for the screens mock the API; the badge change is render-safe).

```bash
git add -A
git commit -m "feat(web): coach-only compliance with pending state + assigned meal title"
```

---

## Self-Review

- Entry requires `planItemId`; category derived; foreign/inactive plan item rejected; ≥1 photo required (Task 1). ✓
- Compliance is coach-only; metrics over reviewed + pendingReview (Task 1). ✓
- `/me/plan/today` reports `loggedEntryId`; coach entry shows `assignedTitle` (Task 2). ✓
- My Plan = action hub (pending → upload, done → view); Evidence screen (photo + symptoms only, no category/compliance); free add + `/add` + bottom-nav "+" removed; nav = Diary/My plan/Settings (Task 3). ✓
- Compliance displays show coach verdict or "Pending"; coach sees assigned title (Task 4). ✓
- Two-layer authz preserved (role guards + ownership: entry creation verifies the plan item is on the client's active plan). ✓
- **After all tasks:** full suite green + e2e smoke (coach assigns plan → client sees today's assigned meals → uploads evidence for one → today flips to "uploaded" → coach reviews + sets compliance → client sees verdict).
