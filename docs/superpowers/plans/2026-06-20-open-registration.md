# Open Registration + Coach Codes Implementation Plan (Plan C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace email-invitation onboarding with open self-registration (client/coach). Coaches get a shareable code; clients link to a coach by entering it (at registration or later in settings, one-time).

**Architecture:** Add a registration path to the auth module, a coach-code generator, and a small client `account` module for `me/coach` linking. Remove the `invitations` module and the coach seeder. Frontend gains a Register screen, shows the coach code in the panel, and adds a client Settings screen.

**Tech Stack:** JavaScript ESM, Express, Sequelize/PostgreSQL, Zod, React, Vite, Vitest, Supertest.

## Global Constraints

- **JavaScript ESM only** (`.js`/`.jsx`), explicit local import extensions, module layering (model/schema/service/controller/route), **no req/res in services**, Zod validation at the controller boundary.
- Roles `client|coach`. Coach code: 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no O/0/I/1), unique, regenerated on collision.
- **Linking is one-time:** a client links to ≤1 coach; linking while already linked → 409. Invalid code at registration → 400; invalid code in settings → 404.
- Design tokens only (primary `#FF3C00`, ink, success, danger); Lucide icons; i18n for all strings; touch targets ≥44px.
- **TDD:** failing test first for services/endpoints. API integration tests run serially against the real PostgreSQL DB.
- `toUser(model)` returns `{ id, role, email, name, coachCode, locale, active }` (coachCode null for clients).

---

### Task 1: Remove invitations module + seeder; switch dev bootstrap to alter

**Files:**
- Delete: `apps/api/src/modules/invitations/` (all 5 files), `apps/api/src/db/seed.js`, `apps/api/tests/invitations.test.js`, `apps/api/tests/seed.test.js`
- Modify: `apps/api/src/app.js` (unmount invitation routers), `apps/api/package.json` (remove `seed` script), `apps/api/src/server.js` (`sync({ alter: true })`), `packages/shared/src/schemas.js` (remove `acceptInviteSchema`), `apps/api/tests/mealplans.test.js` + `apps/api/tests/coaching.test.js` (replace `seedCoach()` with a local coach-creation helper)

**Interfaces:**
- After this task: no invitations endpoints, no `seedCoach`, no `acceptInviteSchema`. `mealplans`/`coaching` tests create their coach via `UserModel.create({ role: "coach", ... })`.

- [ ] **Step 1: Delete the invitations module + seeder + their tests**

```bash
git rm -r apps/api/src/modules/invitations
git rm apps/api/src/db/seed.js apps/api/tests/invitations.test.js apps/api/tests/seed.test.js
```

- [ ] **Step 2: Unmount invitation routers in `apps/api/src/app.js`**

Remove the import line `import { coachInvitationsRouter, inviteAcceptRouter } from "./modules/invitations/invitations.route.js";` and the two `app.use(...)` lines that mount `inviteAcceptRouter` (`/api/auth`) and `coachInvitationsRouter` (`/api/coach`). Leave all other mounts and keep `app.use(errorHandler)` LAST.

- [ ] **Step 3: Remove the `seed` script** from `apps/api/package.json` (delete the `"seed": "node src/db/seed.js"` line).

- [ ] **Step 4: Switch dev bootstrap to alter** in `apps/api/src/server.js`

Change `await sequelize.sync();` to `await sequelize.sync({ alter: true });` (keep the surrounding `authenticate()` + comment; update the comment to note `alter` adds new columns to the existing dev DB and a migration tool is still planned for production).

- [ ] **Step 5: Remove `acceptInviteSchema`** from `packages/shared/src/schemas.js` (delete that schema export; keep `loginSchema`).

- [ ] **Step 6: Replace `seedCoach()` in the dependent tests**

In `apps/api/tests/mealplans.test.js` and `apps/api/tests/coaching.test.js`, remove the `import { seedCoach } from "../src/db/seed.js";` line and replace the `const coach = await seedCoach();` call in `beforeAll` with a direct creation (import `hashPassword` if not already imported):
```js
const coach = await UserModel.create({
  role: "coach", email: "coach@blaze.com", name: "Coach",
  passwordHash: await hashPassword("secret12"),
});
```
(Both files already import `UserModel`. Add the `hashPassword` import from `../src/lib/password.js` if missing.)

- [ ] **Step 7: Run the API suite and commit**

Run: `npm test -w @blaze/api`
Expected: PASS (invitations + seed suites gone; mealplans + coaching still green).

```bash
git add -A
git commit -m "refactor(api): remove invitation onboarding + coach seeder"
```

---

### Task 2: Coach code generator + open registration + client me/coach link

**Files:**
- Create: `apps/api/src/lib/coachCode.js`, `apps/api/src/modules/account/account.service.js`, `account.controller.js`, `account.route.js`
- Modify: `apps/api/src/modules/users/users.model.js` (add `coachCode`), `apps/api/src/modules/coaching/coachClients.model.js` (add unique index on `client_id`), `packages/shared/src/schemas.js` (add `registerSchema`, `linkCoachSchema`), `apps/api/src/modules/auth/auth.schema.js`, `auth.service.js` (add `register`, `toUser` includes coachCode), `auth.controller.js`, `auth.route.js`, `apps/api/src/app.js` (mount account router)
- Test: `apps/api/tests/register.test.js`, `apps/api/tests/account.test.js`

**Interfaces:**
- `uniqueCoachCode() -> Promise<string>`.
- `authService.register({ name, email, password, role, coachCode }) -> { accessToken, refreshToken, user }`; coach → user.coachCode set; client+valid code → linked; invalid code → 400; duplicate email → 409.
- `accountService.getCoach(clientId) -> { id, name } | null`; `accountService.linkCoach(clientId, coachCode) -> { id, name }` (409 if already linked, 404 if code invalid).
- Routes: `POST /api/auth/register`; `GET /api/me/coach`, `POST /api/me/coach` (role client).

- [ ] **Step 1: Add `coachCode` to UserModel**

In `apps/api/src/modules/users/users.model.js`, add to the `init` attributes (after `name`):
```js
    coachCode: { type: DataTypes.STRING, allowNull: true, unique: true },
```

- [ ] **Step 2: Add unique client index to CoachClientModel**

In `apps/api/src/modules/coaching/coachClients.model.js`, change the `indexes` option to:
```js
    indexes: [
      { unique: true, fields: ["coach_id", "client_id"] },
      { unique: true, fields: ["client_id"] },
    ],
```

- [ ] **Step 3: Create `apps/api/src/lib/coachCode.js`**

```js
import { randomInt } from "node:crypto";
import { UserModel } from "../modules/users/users.model.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1

export function generateCoachCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

export async function uniqueCoachCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateCoachCode();
    if (!(await UserModel.findOne({ where: { coachCode: code } }))) return code;
  }
  throw new Error("Could not generate a unique coach code");
}
```

- [ ] **Step 4: Add shared schemas** in `packages/shared/src/schemas.js`

```js
export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["client", "coach"]),
  coachCode: z.string().min(1).optional(),
});

export const linkCoachSchema = z.object({ coachCode: z.string().min(1) });
```

- [ ] **Step 5: Write the failing tests**

`apps/api/tests/register.test.js`:
```js
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";

let app;
beforeAll(async () => { await sequelize.sync({ force: true }); app = createApp(); });

describe("POST /api/auth/register", () => {
  it("registers a coach and returns a coach code", async () => {
    const res = await request(app).post("/api/auth/register")
      .send({ name: "Coach", email: "coach@x.com", password: "secret12", role: "coach" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("coach");
    expect(res.body.user.coachCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(res.body.accessToken).toBeTruthy();
  });

  it("registers a client with a valid coach code and links them", async () => {
    const coach = await request(app).post("/api/auth/register")
      .send({ name: "C2", email: "coach2@x.com", password: "secret12", role: "coach" });
    const code = coach.body.user.coachCode;
    const client = await request(app).post("/api/auth/register")
      .send({ name: "Cli", email: "cli@x.com", password: "secret12", role: "client", coachCode: code });
    expect(client.status).toBe(201);
    expect(client.body.user.role).toBe("client");
    // the coach now lists this client
    const list = await request(app).get("/api/coach/clients").set("Authorization", `Bearer ${coach.body.accessToken}`);
    expect(list.body.some((c) => c.email === "cli@x.com")).toBe(true);
  });

  it("rejects a client registering with an invalid coach code (400)", async () => {
    const res = await request(app).post("/api/auth/register")
      .send({ name: "X", email: "x@x.com", password: "secret12", role: "client", coachCode: "ZZZZZZ" });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email (409)", async () => {
    await request(app).post("/api/auth/register").send({ name: "D", email: "dup@x.com", password: "secret12", role: "client" });
    const res = await request(app).post("/api/auth/register").send({ name: "D2", email: "dup@x.com", password: "secret12", role: "client" });
    expect(res.status).toBe(409);
  });
});
```

`apps/api/tests/account.test.js`:
```js
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";

let app, coachCode, coachToken;
beforeAll(async () => {
  await sequelize.sync({ force: true });
  app = createApp();
  const coach = await request(app).post("/api/auth/register")
    .send({ name: "Coach", email: "co@x.com", password: "secret12", role: "coach" });
  coachCode = coach.body.user.coachCode;
  coachToken = coach.body.accessToken;
});

describe("client me/coach link", () => {
  it("links an unlinked client and then reports the coach", async () => {
    const client = await request(app).post("/api/auth/register")
      .send({ name: "Cli", email: "cli2@x.com", password: "secret12", role: "client" });
    const token = client.body.accessToken;

    const before = await request(app).get("/api/me/coach").set("Authorization", `Bearer ${token}`);
    expect(before.body).toBeNull();

    const link = await request(app).post("/api/me/coach").set("Authorization", `Bearer ${token}`).send({ coachCode });
    expect(link.status).toBe(200);
    expect(link.body.name).toBe("Coach");

    const after = await request(app).get("/api/me/coach").set("Authorization", `Bearer ${token}`);
    expect(after.body.name).toBe("Coach");
  });

  it("rejects linking when already linked (409)", async () => {
    const client = await request(app).post("/api/auth/register")
      .send({ name: "Cli3", email: "cli3@x.com", password: "secret12", role: "client", coachCode });
    const token = client.body.accessToken;
    const res = await request(app).post("/api/me/coach").set("Authorization", `Bearer ${token}`).send({ coachCode });
    expect(res.status).toBe(409);
  });

  it("rejects an invalid coach code (404)", async () => {
    const client = await request(app).post("/api/auth/register")
      .send({ name: "Cli4", email: "cli4@x.com", password: "secret12", role: "client" });
    const res = await request(app).post("/api/me/coach").set("Authorization", `Bearer ${client.body.accessToken}`).send({ coachCode: "ZZZZZZ" });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `npm test -w @blaze/api -- register account`
Expected: FAIL (routes missing).

- [ ] **Step 7: Update `auth.schema.js`**

```js
export { loginSchema, registerSchema } from "@blaze/shared";
```

- [ ] **Step 8: Update `auth.service.js`** — add `register`, include `coachCode` in `toUser`

Replace `toUser` and add `register` (keep the existing `login`):
```js
import { UserModel } from "../users/users.model.js";
import { CoachClientModel } from "../coaching/coachClients.model.js";
import { verifyPassword, hashPassword } from "../../lib/password.js";
import { signAccess, signRefresh } from "../../lib/jwt.js";
import { uniqueCoachCode } from "../../lib/coachCode.js";
import { HttpError } from "../../middleware/error.js";

function toUser(m) {
  return { id: m.id, role: m.role, email: m.email, name: m.name, coachCode: m.coachCode ?? null, locale: m.locale, active: m.active };
}

function tokensFor(user) {
  const payload = { sub: user.id, role: user.role };
  return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: toUser(user) };
}

export const authService = {
  async login(email, password) {
    const user = await UserModel.findOne({ where: { email } });
    if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid credentials");
    }
    return tokensFor(user);
  },

  async register({ name, email, password, role, coachCode }) {
    if (await UserModel.findOne({ where: { email } })) throw new HttpError(409, "Email already registered");
    let coach = null;
    if (role === "client" && coachCode) {
      coach = await UserModel.findOne({ where: { role: "coach", coachCode } });
      if (!coach) throw new HttpError(400, "Invalid coach code");
    }
    const user = await UserModel.create({
      role, email, name, locale: "es",
      passwordHash: await hashPassword(password),
      coachCode: role === "coach" ? await uniqueCoachCode() : null,
    });
    if (coach) await CoachClientModel.create({ coachId: coach.id, clientId: user.id });
    return tokensFor(user);
  },

  toUser,
};
```
(`password.js` already exports `hashPassword` and `verifyPassword`.)

- [ ] **Step 9: Update `auth.controller.js`** — add `register`

```js
import { authService } from "./auth.service.js";

export const authController = {
  async login(req, res, next) {
    try { res.json(await authService.login(req.body.email, req.body.password)); }
    catch (err) { next(err); }
  },
  async register(req, res, next) {
    try { res.status(201).json(await authService.register(req.body)); }
    catch (err) { next(err); }
  },
};
```

- [ ] **Step 10: Update `auth.route.js`** — add register route

```js
import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { authController } from "./auth.controller.js";

export const authRouter = Router();
authRouter.post("/login", validate(loginSchema), authController.login);
authRouter.post("/register", validate(registerSchema), authController.register);
```

- [ ] **Step 11: Create the `account` module** (client self-service `me/coach`)

`apps/api/src/modules/account/account.service.js`:
```js
import { CoachClientModel } from "../coaching/coachClients.model.js";
import { UserModel } from "../users/users.model.js";
import { HttpError } from "../../middleware/error.js";

export const accountService = {
  async getCoach(clientId) {
    const link = await CoachClientModel.findOne({ where: { clientId } });
    if (!link) return null;
    const coach = await UserModel.findByPk(link.coachId);
    return coach ? { id: coach.id, name: coach.name } : null;
  },

  async linkCoach(clientId, coachCode) {
    if (await CoachClientModel.findOne({ where: { clientId } })) throw new HttpError(409, "Already linked to a coach");
    const coach = await UserModel.findOne({ where: { role: "coach", coachCode } });
    if (!coach) throw new HttpError(404, "Invalid coach code");
    await CoachClientModel.create({ coachId: coach.id, clientId });
    return { id: coach.id, name: coach.name };
  },
};
```

`apps/api/src/modules/account/account.controller.js`:
```js
import { accountService } from "./account.service.js";

export const accountController = {
  async getCoach(req, res, next) {
    try { res.json(await accountService.getCoach(req.user.sub)); }
    catch (err) { next(err); }
  },
  async linkCoach(req, res, next) {
    try { res.json(await accountService.linkCoach(req.user.sub, req.body.coachCode)); }
    catch (err) { next(err); }
  },
};
```

`apps/api/src/modules/account/account.route.js`:
```js
import { Router } from "express";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { linkCoachSchema } from "@blaze/shared";
import { accountController } from "./account.controller.js";

export const accountRouter = Router(); // mounted at /api/me
accountRouter.use(authGuard, roleGuard("client"));
accountRouter.get("/coach", accountController.getCoach);
accountRouter.post("/coach", validate(linkCoachSchema), accountController.linkCoach);
```

- [ ] **Step 12: Mount the account router in `app.js`**

Add `import { accountRouter } from "./modules/account/account.route.js";` and, before `app.use(errorHandler)`, `app.use("/api/me", accountRouter);`.

- [ ] **Step 13: Run tests and commit**

Run: `npm test -w @blaze/api -- register account` then `npm test -w @blaze/api` (full).
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): open registration + coach codes + client me/coach link"
```

---

### Task 3: Frontend — Register screen + auth flow

**Files:**
- Modify: `apps/web/src/lib/auth.jsx` (add `register`), `apps/web/src/app/router.jsx` (add `/register` public route), `apps/web/src/features/auth/LoginScreen.jsx` (link to register), `apps/web/src/locales/es.json` + `en.json` (register strings)
- Create: `apps/web/src/features/auth/RegisterScreen.jsx`
- Test: `apps/web/src/features/auth/RegisterScreen.test.jsx`

**Interfaces:**
- `useAuth().register({ name, email, password, role, coachCode? }) -> user` (stores tokens + user like login).
- `RegisterScreen`: role toggle (client/coach); client shows an optional coach-code field; on success a coach sees their generated code with a continue button, a client navigates to `/home`.

- [ ] **Step 1: Add `register` to `auth.jsx`**

In `AuthProvider`, add alongside `login` (reuse the same persistence):
```jsx
  async function persist(res) {
    localStorage.setItem("accessToken", res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);
    localStorage.setItem("user", JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  }
  async function login(email, password) { return persist(await api.post("/auth/login", { email, password })); }
  async function register(payload) { return persist(await api.post("/auth/register", payload)); }
```
Expose `register` in the context value: `{ user, login, register, logout }`.

- [ ] **Step 2: Add i18n register strings**

Merge into `es.json` (and English mirror into `en.json`):
```json
"register": { "title": "Crear cuenta", "name": "Nombre", "role": "Tipo de cuenta", "asClient": "Cliente", "asCoach": "Coach", "coachCode": "Código de coach (opcional)", "submit": "Registrarme", "haveAccount": "¿Ya tienes cuenta? Inicia sesión", "noAccount": "¿No tienes cuenta? Regístrate", "yourCode": "Tu código de coach", "shareCode": "Compártelo con tus clientes para que se vinculen a ti.", "continue": "Continuar" }
```
English: title "Create account", name "Name", role "Account type", asClient "Client", asCoach "Coach", coachCode "Coach code (optional)", submit "Sign up", haveAccount "Already have an account? Log in", noAccount "No account? Sign up", yourCode "Your coach code", shareCode "Share it with your clients so they can link to you.", continue "Continue".

- [ ] **Step 3: Write the failing test**

`features/auth/RegisterScreen.test.jsx`:
```jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../lib/auth.jsx";
import { RegisterScreen } from "./RegisterScreen.jsx";
import "../../lib/i18n.js";

it("renders the register form with role options", () => {
  render(<MemoryRouter><AuthProvider><RegisterScreen /></AuthProvider></MemoryRouter>);
  expect(screen.getByRole("button", { name: /registrarme/i })).toBeInTheDocument();
  expect(screen.getByText(/cliente/i)).toBeInTheDocument();
  expect(screen.getByText(/coach/i)).toBeInTheDocument();
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npm test -w @blaze/web -- RegisterScreen`
Expected: FAIL (module missing).

- [ ] **Step 5: Create `features/auth/RegisterScreen.jsx`**

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth.jsx";
import { Button } from "../../components/Button.jsx";

const field = "w-full p-3 border-2 border-ink rounded-none";

export function RegisterScreen() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "client", coachCode: "" });
  const [error, setError] = useState(null);
  const [coachCode, setCoachCode] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = { name: form.name, email: form.email, password: form.password, role: form.role };
      if (form.role === "client" && form.coachCode) payload.coachCode = form.coachCode;
      const user = await register(payload);
      if (user.role === "coach") setCoachCode(user.coachCode);
      else navigate("/home");
    } catch (err) {
      setError(err.message || "error");
    }
  }

  if (coachCode) {
    return (
      <div className="mx-auto max-w-[430px] p-6 space-y-4 text-center">
        <h1 className="font-heading uppercase tracking-wide text-2xl">{t("register.yourCode")}</h1>
        <div className="border-2 border-primary text-primary font-heading text-3xl tracking-[0.3em] py-4">{coachCode}</div>
        <p className="text-ink/70 text-sm">{t("register.shareCode")}</p>
        <Button variant="primary" className="w-full" onClick={() => navigate("/coach")}>{t("register.continue")}</Button>
      </div>
    );
  }

  const roleBtn = (value, label) => (
    <button type="button" onClick={() => setForm({ ...form, role: value })}
      className={`flex-1 min-h-[44px] border-2 font-heading uppercase tracking-wide ${form.role === value ? "bg-primary text-white border-primary" : "bg-white text-ink border-ink"}`}>
      {label}
    </button>
  );

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-[430px] p-4 space-y-4">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{t("register.title")}</h1>
      <label className="block space-y-1"><span className="font-heading uppercase text-sm">{t("register.name")}</span>
        <input aria-label={t("register.name")} value={form.name} onChange={set("name")} className={field} required /></label>
      <label className="block space-y-1"><span className="font-heading uppercase text-sm">{t("auth.email")}</span>
        <input aria-label={t("auth.email")} type="email" value={form.email} onChange={set("email")} className={field} required /></label>
      <label className="block space-y-1"><span className="font-heading uppercase text-sm">{t("auth.password")}</span>
        <input aria-label={t("auth.password")} type="password" value={form.password} onChange={set("password")} className={field} required minLength={8} /></label>
      <div className="space-y-1">
        <span className="font-heading uppercase text-sm">{t("register.role")}</span>
        <div className="flex gap-2">{roleBtn("client", t("register.asClient"))}{roleBtn("coach", t("register.asCoach"))}</div>
      </div>
      {form.role === "client" && (
        <label className="block space-y-1"><span className="font-heading uppercase text-sm">{t("register.coachCode")}</span>
          <input aria-label={t("register.coachCode")} value={form.coachCode} onChange={set("coachCode")} className={field} /></label>
      )}
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full">{t("register.submit")}</Button>
      <button type="button" onClick={() => navigate("/login")} className="w-full text-sm text-ink/70 underline">{t("register.haveAccount")}</button>
    </form>
  );
}
```

- [ ] **Step 6: Add the `/register` route + login link**

In `app/router.jsx`, add `import { RegisterScreen } from "../features/auth/RegisterScreen.jsx";` and a public route `{ path: "/register", element: <RegisterScreen /> }` (next to `/login`).
In `features/auth/LoginScreen.jsx`, add below the submit button:
```jsx
      <button type="button" onClick={() => navigate("/register")} className="w-full text-sm text-ink/70 underline">{t("register.noAccount")}</button>
```
(`navigate` and `t` are already in scope in LoginScreen.)

- [ ] **Step 7: Run test and commit**

Run: `npm test -w @blaze/web -- RegisterScreen` then `npm test -w @blaze/web` (full).
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): registration screen (role toggle, coach code) + auth wiring"
```

---

### Task 4: Frontend — Coach code in panel + client Settings (link coach); remove invite UI

**Files:**
- Modify: `apps/web/src/features/coach/ClientsScreen.jsx` (show coach code, remove invite form), `apps/web/src/components/BottomNav.jsx` (add Settings), `apps/web/src/app/router.jsx` (add `/settings` client route), `apps/web/src/locales/es.json` + `en.json` (settings strings)
- Create: `apps/web/src/features/account/SettingsScreen.jsx`
- Test: `apps/web/src/features/account/SettingsScreen.test.jsx`

**Interfaces:**
- `ClientsScreen` shows `useAuth().user.coachCode` (copyable) and no longer has an invite form.
- `SettingsScreen` (`/settings`, client): `api.get("/me/coach")` → shows the linked coach name, or a coach-code input that `api.post("/me/coach", { coachCode })`; on 409/404 shows an error.

- [ ] **Step 1: Add i18n settings strings**

Merge into `es.json` (English mirror into `en.json`):
```json
"settings": { "title": "Ajustes", "yourCoach": "Tu coach", "noCoach": "Aún no estás vinculado a un coach", "enterCode": "Código de coach", "link": "Vincular", "linked": "Vinculado a", "invalid": "Código inválido", "already": "Ya estás vinculado a un coach" },
"coach": { "yourCode": "Tu código", "copy": "Copiar" }
```
(Keep the existing `coach.*` keys; add `yourCode` + `copy`. English: settings → title "Settings", yourCoach "Your coach", noCoach "You're not linked to a coach yet", enterCode "Coach code", link "Link", linked "Linked to", invalid "Invalid code", already "You're already linked to a coach"; coach.yourCode "Your code", coach.copy "Copy".)

- [ ] **Step 2: Update `ClientsScreen.jsx`** — show coach code, drop invite form

Replace the invite `<form>` and the `inviteToken` state with a code banner that reads the code from auth:
```jsx
import { useAuth } from "../../lib/auth.jsx";
// ...
const { user } = useAuth();
// remove email/inviteToken state and the invite() function and its form/link.
// Add near the top of the returned JSX, under the <h1>:
{user?.coachCode && (
  <div className="flex items-center justify-between border-2 border-primary p-3">
    <div>
      <div className="font-heading uppercase text-xs text-ink/60">{t("coach.yourCode")}</div>
      <div className="font-heading text-2xl tracking-[0.3em] text-primary">{user.coachCode}</div>
    </div>
    <button onClick={() => navigator.clipboard?.writeText(user.coachCode)} className="border-2 border-ink min-h-[44px] px-3 font-heading uppercase text-sm">{t("coach.copy")}</button>
  </div>
)}
```
Keep the clients list + `api.get("/coach/clients")` exactly as before. Remove the now-unused `api.post` import usage and `Button` if no longer used.

- [ ] **Step 3: Add Settings to `BottomNav.jsx`**

Add a fourth nav item (import `Settings` from lucide-react):
```jsx
<NavLink to="/settings" className={cls}><Settings className="w-5 h-5" />{t("settings.title")}</NavLink>
```

- [ ] **Step 4: Write the failing test**

`features/account/SettingsScreen.test.jsx`:
```jsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({ api: { get: vi.fn().mockResolvedValue(null), post: vi.fn() } }));
import { SettingsScreen } from "./SettingsScreen.jsx";

it("shows the link-coach form when the client has no coach", async () => {
  render(<MemoryRouter><SettingsScreen /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole("button", { name: /vincular/i })).toBeInTheDocument());
});
```

- [ ] **Step 5: Run to verify failure**

Run: `npm test -w @blaze/web -- SettingsScreen`
Expected: FAIL (module missing).

- [ ] **Step 6: Create `features/account/SettingsScreen.jsx`**

```jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";

export function SettingsScreen() {
  const { t } = useTranslation();
  const [coach, setCoach] = useState(undefined);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);

  function load() { api.get("/me/coach").then(setCoach).catch(() => setCoach(null)); }
  useEffect(() => { load(); }, []);

  async function link(e) {
    e.preventDefault();
    setError(null);
    try { setCoach(await api.post("/me/coach", { coachCode: code })); setCode(""); }
    catch (err) { setError(err.message === "Already linked to a coach" ? t("settings.already") : t("settings.invalid")); }
  }

  return (
    <>
      <AppHeader title={t("settings.title").toUpperCase()} />
      <div className="flex-1 p-4 space-y-4">
        <h2 className="font-heading uppercase tracking-wide text-sm">{t("settings.yourCoach")}</h2>
        {coach === undefined ? <Spinner /> : coach ? (
          <div className="border-2 border-success p-3">
            <span className="font-heading uppercase text-xs text-ink/60">{t("settings.linked")}</span>
            <div className="font-bold">{coach.name}</div>
          </div>
        ) : (
          <form onSubmit={link} className="space-y-2">
            <p className="text-ink/60 text-sm">{t("settings.noCoach")}</p>
            <input aria-label={t("settings.enterCode")} value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("settings.enterCode")} className="w-full p-3 border-2 border-ink rounded-none" required />
            {error && <p role="alert" className="text-danger">{error}</p>}
            <Button type="submit" variant="primary" className="w-full">{t("settings.link")}</Button>
          </form>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 7: Add the `/settings` client route**

In `app/router.jsx`, import `SettingsScreen` and add `{ path: "/settings", element: <SettingsScreen /> }` inside the client `ClientShell` children (next to `/plan`).

- [ ] **Step 8: Run test and commit**

Run: `npm test -w @blaze/web -- SettingsScreen` then `npm test -w @blaze/web` (full — ClientsScreen test must still pass after the invite-form removal; if that test asserted invite behavior, update it to assert the clients list still renders).
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): coach code in panel + client settings to link a coach; remove invite UI"
```

---

## Self-Review

- Open registration (client/coach), coach code generated + returned, client links with/without code, invalid → 400, duplicate email → 409 (Task 2). ✓
- Client me/coach: get + link, one-time (409), invalid (404) (Task 2). ✓
- Invitations module + seeder + acceptInviteSchema removed; dependent tests fixed; dev bootstrap alters schema (Task 1). ✓
- Register screen with role toggle + optional code; coach sees code; login↔register links (Task 3). ✓
- Coach code shown/copyable in panel; client Settings to link; invite UI removed; Settings in bottom nav (Task 4). ✓
- Two-layer authz preserved (role guards on routers; ownership in services). coach_clients unique(client_id) enforces one coach per client. ✓
- **After all tasks:** full suite green + e2e smoke of the new flow (register coach → get code → register client with code → coach lists client; client without code links via settings).
