# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Blaze Lifestyle monorepo with a working Express+PostgreSQL API (auth, invitation-based onboarding, R2 photo storage helper) and a React+Vite PWA shell (router, i18n, design system), so the Nutrition feature plans can build on it.

**Architecture:** npm workspaces monorepo with `apps/api` (Express + Sequelize + PostgreSQL), `apps/web` (React + Vite + Tailwind), and `packages/shared` (enums/constants + Zod schemas shared by both). The API is organized by module using a strict Model · Schema · Service · Controller · Route layering. Auth is JWT-based; the single coach is seeded; clients join via invitation links.

**Tech Stack:** **JavaScript (ESM, no TypeScript)**, Express, Sequelize, PostgreSQL, Zod, jsonwebtoken, bcryptjs, @aws-sdk/client-s3 (Cloudflare R2), sharp, React, Vite, Tailwind CSS, React Router, react-i18next, Vitest, Supertest.

## Global Constraints

- **Language: JavaScript (ESM) only — no TypeScript.** Every package sets `"type": "module"`; use `import`/`export`. Node code is `.js`; React components are `.jsx`. Node ESM imports of local files use **explicit file extensions** (e.g. `import { x } from "./enums.js"`).
- **Backend module layering:** every API module lives in `apps/api/src/modules/<name>/` with files `<name>.model.js`, `<name>.schema.js`, `<name>.service.js`, `<name>.controller.js`, `<name>.route.js`. Controllers stay thin; business logic lives in services (no `req`/`res` in services).
- **Authorization in two layers:** route-level role guard (`client` | `coach`) AND service-level ownership checks.
- **Validation:** all request input validated with Zod at the controller boundary before reaching services.
- **Roles:** `client` | `coach`. **Locales:** `es` | `en` (default `es`). **Meal categories:** `Breakfast`, `AM Snack`, `Lunch`, `PM Snack`, `Dinner`, `Supplement`.
- **Design tokens (never hardcode hex in components):** primary `#FF3C00`, ink `#000000`, success `#22C55E`, danger `#EF4444`. Headings Barlow Condensed (UPPERCASE, tracking-wide); body Barlow; fallback `system-ui`. Brutalist: 2px borders, square corners (`rounded-none`), no shadows. Icons: Lucide only (no emoji).
- **i18n:** every user-facing string goes through react-i18next.
- **TDD:** write the failing test first for services, guards, and storage logic. Frequent commits.
- **Photos:** R2 objects are private; never expose public URLs.

---

## File Structure

```
package.json                         # workspaces root
packages/shared/
  package.json
  src/index.js                       # re-exports ./enums.js, ./schemas.js
  src/enums.js                       # ROLES, LOCALES, MEAL_CATEGORIES, COMPLIANCE
  src/schemas.js                     # shared Zod schemas (login, accept-invite)
apps/api/
  package.json
  .env.example
  src/config.js                      # env parsing
  src/lib/db.js                      # Sequelize instance
  src/lib/storage.js                 # R2 + sharp helper
  src/lib/jwt.js                     # sign/verify access+refresh
  src/lib/password.js                # hash/compare
  src/middleware/error.js            # central error handler + HttpError
  src/middleware/validate.js         # Zod validation middleware
  src/middleware/auth.js             # authGuard + roleGuard
  src/modules/users/users.model.js
  src/modules/auth/auth.schema.js
  src/modules/auth/auth.service.js
  src/modules/auth/auth.controller.js
  src/modules/auth/auth.route.js
  src/modules/invitations/invitations.model.js
  src/modules/invitations/invitations.schema.js
  src/modules/invitations/invitations.service.js
  src/modules/invitations/invitations.controller.js
  src/modules/invitations/invitations.route.js
  src/modules/coaching/coachClients.model.js
  src/db/seed.js                     # seeds the single coach
  src/app.js                         # express app factory
  src/server.js                      # listen
  tests/*.test.js
apps/web/
  package.json
  vite.config.js
  tailwind.config.js
  postcss.config.js
  index.html
  public/manifest.webmanifest
  src/main.jsx
  src/App.jsx
  src/test-setup.js
  src/styles/tokens.css
  src/lib/i18n.js
  src/lib/api.js
  src/lib/auth.jsx                    # AuthProvider + useAuth
  src/locales/es.json
  src/locales/en.json
  src/components/Button.jsx
  src/app/router.jsx
  src/features/auth/LoginScreen.jsx
```

---

### Task 2: Shared enums and Zod schemas

**Files:**
- Create: `packages/shared/src/enums.js`, `packages/shared/src/schemas.js`
- Test: `packages/shared/src/schemas.test.js`
- (Already exists from Task 1: `packages/shared/src/index.js` re-exporting `./enums.js` and `./schemas.js`; `package.json` with vitest.)

**Interfaces:**
- Produces: `ROLES`, `LOCALES`, `MEAL_CATEGORIES`, `COMPLIANCE` (arrays of string literals); Zod schemas `loginSchema`, `acceptInviteSchema`.

- [ ] **Step 1: Write the failing test**

`packages/shared/src/schemas.test.js`:
```js
import { describe, it, expect } from "vitest";
import { loginSchema, acceptInviteSchema } from "./schemas.js";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.parse({ email: "a@b.com", password: "secret12" })).toBeTruthy();
  });
  it("rejects short passwords", () => {
    expect(() => loginSchema.parse({ email: "a@b.com", password: "x" })).toThrow();
  });
});

describe("acceptInviteSchema", () => {
  it("requires name and password", () => {
    expect(() => acceptInviteSchema.parse({ name: "", password: "secret12" })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/shared`
Expected: FAIL ("Cannot find module ./schemas.js").

- [ ] **Step 3: Create `enums.js`**

```js
export const ROLES = ["client", "coach"];
export const LOCALES = ["es", "en"];
export const MEAL_CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];
export const COMPLIANCE = ["yes", "no", "na"];
```

- [ ] **Step 4: Create `schemas.js`**

```js
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const acceptInviteSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(8),
});
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test -w @blaze/shared`
Expected: PASS.

```bash
git add -A
git commit -m "feat(shared): enums and auth Zod schemas"
```

---

### Task 3: API skeleton + health endpoint

**Files:**
- Create: `apps/api/package.json`, `apps/api/.env.example`, `apps/api/src/config.js`, `apps/api/src/middleware/error.js`, `apps/api/src/app.js`, `apps/api/src/server.js`
- Test: `apps/api/tests/health.test.js`
- (Note: `apps/api/.env` already exists locally with real values; do not overwrite it. Create `.env.example` only.)

**Interfaces:**
- Produces: `createApp()` returning an Express app (used by all integration tests and `server.js`); `config` object with parsed env; `HttpError` class and `errorHandler` middleware.

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "@blaze/api",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/server.js",
    "test": "vitest run",
    "seed": "node src/db/seed.js"
  },
  "dependencies": {
    "@blaze/shared": "*",
    "express": "^4.19.2",
    "sequelize": "^6.37.3",
    "pg": "^8.12.0",
    "pg-hstore": "^2.3.4",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.8",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.4",
    "@aws-sdk/client-s3": "^3.620.0",
    "dotenv": "^16.4.5",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 2: Create `apps/api/.env.example`**

```
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/blaze
JWT_ACCESS_SECRET=dev-access-secret
JWT_REFRESH_SECRET=dev-refresh-secret
SEED_COACH_EMAIL=coach@blaze.com
SEED_COACH_PASSWORD=changeme123
SEED_COACH_NAME=Blaze Coach
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=blaze-photos
WEB_ORIGIN=http://localhost:5173
```

- [ ] **Step 3: Create `apps/api/src/config.js`**

```js
import "dotenv/config";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  seedCoach: {
    email: process.env.SEED_COACH_EMAIL ?? "coach@blaze.com",
    password: process.env.SEED_COACH_PASSWORD ?? "changeme123",
    name: process.env.SEED_COACH_NAME ?? "Blaze Coach",
  },
  r2: {
    endpoint: process.env.R2_ENDPOINT ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_BUCKET ?? "blaze-photos",
  },
};
```

- [ ] **Step 4: Create `apps/api/src/middleware/error.js`**

```js
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "ValidationError", details: err.flatten() });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "InternalServerError" });
}
```

- [ ] **Step 5: Write the failing test**

`apps/api/tests/health.test.js`:
```js
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `npm install && npm test -w @blaze/api`
Expected: FAIL ("Cannot find module ../src/app.js").

- [ ] **Step 7: Create `apps/api/src/app.js`**

```js
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.webOrigin, credentials: true }));
  app.use(express.json());
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 8: Create `apps/api/src/server.js`**

```js
import { createApp } from "./app.js";
import { config } from "./config.js";

createApp().listen(config.port, () => {
  console.log(`API listening on :${config.port}`);
});
```

- [ ] **Step 9: Run test and commit**

Run: `npm test -w @blaze/api`
Expected: PASS. (`apps/api/.env` already exists with `DATABASE_URL` etc.)

```bash
git add -A
git commit -m "feat(api): express app skeleton with health endpoint"
```

---

### Task 4: Database layer (Sequelize) + User model

**Files:**
- Create: `apps/api/src/lib/db.js`, `apps/api/src/modules/users/users.model.js`
- Test: `apps/api/tests/user-model.test.js`

**Interfaces:**
- Consumes: `config.databaseUrl`.
- Produces: `sequelize` instance (exported from `lib/db.js`); `UserModel` with attributes `id, role, email, passwordHash, name, locale, active` (column names underscored: `password_hash`, etc.).

- [ ] **Step 1: Create `apps/api/src/lib/db.js`**

```js
import { Sequelize } from "sequelize";
import { config } from "../config.js";

export const sequelize = new Sequelize(config.databaseUrl, {
  dialect: "postgres",
  logging: false,
});
```

- [ ] **Step 2: Write the failing test**

`apps/api/tests/user-model.test.js`:
```js
import { describe, it, expect, beforeAll } from "vitest";
import { sequelize } from "../src/lib/db.js";
import { UserModel } from "../src/modules/users/users.model.js";

describe("UserModel", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });
  it("creates a coach user with defaults", async () => {
    const u = await UserModel.create({
      role: "coach", email: "c@b.com", passwordHash: "x", name: "Coach",
    });
    expect(u.id).toBeTruthy();
    expect(u.locale).toBe("es");
    expect(u.active).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -w @blaze/api -- user-model`
Expected: FAIL ("Cannot find module ...users.model.js").

- [ ] **Step 4: Create `apps/api/src/modules/users/users.model.js`**

```js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class UserModel extends Model {}

UserModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    role: { type: DataTypes.ENUM("client", "coach"), allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    locale: { type: DataTypes.ENUM("es", "en"), allowNull: false, defaultValue: "es" },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: "users", underscored: true },
);
```

- [ ] **Step 5: Run test and commit**

Run: `npm test -w @blaze/api -- user-model`
Expected: PASS (requires PostgreSQL running at `DATABASE_URL`; one is available locally).

```bash
git add -A
git commit -m "feat(api): sequelize db layer and user model"
```

---

### Task 5: Password + JWT libs

**Files:**
- Create: `apps/api/src/lib/password.js`, `apps/api/src/lib/jwt.js`
- Test: `apps/api/tests/auth-lib.test.js`

**Interfaces:**
- Produces: `hashPassword(pw) -> Promise<string>`, `verifyPassword(pw, hash) -> Promise<boolean>`; `signAccess(payload)`, `signRefresh(payload)`, `verifyAccess(token)`, `verifyRefresh(token)`. Payload shape: `{ sub, role }`.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/auth-lib.test.js`:
```js
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password.js";
import { signAccess, verifyAccess } from "../src/lib/jwt.js";

describe("password lib", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("secret12");
    expect(await verifyPassword("secret12", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("jwt lib", () => {
  it("signs and verifies an access token", () => {
    const token = signAccess({ sub: "u1", role: "coach" });
    expect(verifyAccess(token)).toMatchObject({ sub: "u1", role: "coach" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/api -- auth-lib`
Expected: FAIL ("Cannot find module ../src/lib/password.js").

- [ ] **Step 3: Create `apps/api/src/lib/password.js`**

```js
import bcrypt from "bcryptjs";

export const hashPassword = (pw) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash);
```

- [ ] **Step 4: Create `apps/api/src/lib/jwt.js`**

```js
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export const signAccess = (p) => jwt.sign(p, config.jwtAccessSecret, { expiresIn: "15m" });
export const signRefresh = (p) => jwt.sign(p, config.jwtRefreshSecret, { expiresIn: "30d" });
export const verifyAccess = (token) => jwt.verify(token, config.jwtAccessSecret);
export const verifyRefresh = (token) => jwt.verify(token, config.jwtRefreshSecret);
```

- [ ] **Step 5: Run test and commit**

Run: `npm test -w @blaze/api -- auth-lib`
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): password hashing and jwt helpers"
```

---

### Task 6: Auth + validation middleware

**Files:**
- Create: `apps/api/src/middleware/auth.js`, `apps/api/src/middleware/validate.js`
- Test: `apps/api/tests/auth-middleware.test.js`

**Interfaces:**
- Consumes: `verifyAccess`, `HttpError`.
- Produces: `authGuard` (sets `req.user = { sub, role }` from the bearer token), `roleGuard(role)`, `validate(schema)` (parses+replaces `req.body`).

- [ ] **Step 1: Write the failing test**

`apps/api/tests/auth-middleware.test.js`:
```js
import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { authGuard, roleGuard } from "../src/middleware/auth.js";
import { errorHandler } from "../src/middleware/error.js";
import { signAccess } from "../src/lib/jwt.js";

function appWith() {
  const app = express();
  app.get("/coach-only", authGuard, roleGuard("coach"), (req, res) =>
    res.json({ sub: req.user.sub }));
  app.use(errorHandler);
  return app;
}

describe("auth middleware", () => {
  it("401 without token", async () => {
    expect((await request(appWith()).get("/coach-only")).status).toBe(401);
  });
  it("403 for wrong role", async () => {
    const t = signAccess({ sub: "u1", role: "client" });
    expect((await request(appWith()).get("/coach-only").set("Authorization", `Bearer ${t}`)).status).toBe(403);
  });
  it("200 for coach", async () => {
    const t = signAccess({ sub: "u1", role: "coach" });
    const res = await request(appWith()).get("/coach-only").set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.sub).toBe("u1");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/api -- auth-middleware`
Expected: FAIL ("Cannot find module ../src/middleware/auth.js").

- [ ] **Step 3: Create `apps/api/src/middleware/auth.js`**

```js
import { verifyAccess } from "../lib/jwt.js";
import { HttpError } from "./error.js";

export function authGuard(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return next(new HttpError(401, "Unauthorized"));
  try {
    req.user = verifyAccess(header.slice(7));
    next();
  } catch {
    next(new HttpError(401, "Unauthorized"));
  }
}

export const roleGuard = (role) => (req, _res, next) => {
  if (!req.user || req.user.role !== role) return next(new HttpError(403, "Forbidden"));
  next();
};
```

- [ ] **Step 4: Create `apps/api/src/middleware/validate.js`**

```js
export const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 5: Run test and commit**

Run: `npm test -w @blaze/api -- auth-middleware`
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): auth + role guards and zod validation middleware"
```

---

### Task 7: Auth service + login route

**Files:**
- Create: `apps/api/src/modules/auth/auth.schema.js`, `auth.service.js`, `auth.controller.js`, `auth.route.js`
- Modify: `apps/api/src/app.js` (mount `/api/auth`)
- Test: `apps/api/tests/auth-login.test.js`

**Interfaces:**
- Consumes: `UserModel`, `verifyPassword`, `signAccess`, `signRefresh`, `loginSchema`, `HttpError`.
- Produces: `authService.login(email, password) -> { accessToken, refreshToken, user }`; `authService.toUser(model) -> { id, role, email, name, locale, active }`; route `POST /api/auth/login`.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/auth-login.test.js`:
```js
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { hashPassword } from "../src/lib/password.js";

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await UserModel.create({
      role: "coach", email: "c@b.com", name: "Coach",
      passwordHash: await hashPassword("secret12"),
    });
  });
  it("returns tokens for valid credentials", async () => {
    const res = await request(createApp()).post("/api/auth/login")
      .send({ email: "c@b.com", password: "secret12" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe("coach");
  });
  it("401 for bad password", async () => {
    const res = await request(createApp()).post("/api/auth/login")
      .send({ email: "c@b.com", password: "wrongpass" });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/api -- auth-login`
Expected: FAIL (route not mounted → 404).

- [ ] **Step 3: Create `auth.schema.js`**

```js
export { loginSchema } from "@blaze/shared";
```

- [ ] **Step 4: Create `auth.service.js`**

```js
import { UserModel } from "../users/users.model.js";
import { verifyPassword } from "../../lib/password.js";
import { signAccess, signRefresh } from "../../lib/jwt.js";
import { HttpError } from "../../middleware/error.js";

function toUser(m) {
  return { id: m.id, role: m.role, email: m.email, name: m.name, locale: m.locale, active: m.active };
}

export const authService = {
  async login(email, password) {
    const user = await UserModel.findOne({ where: { email } });
    if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid credentials");
    }
    const payload = { sub: user.id, role: user.role };
    return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: toUser(user) };
  },
  toUser,
};
```

- [ ] **Step 5: Create `auth.controller.js`**

```js
import { authService } from "./auth.service.js";

export const authController = {
  async login(req, res, next) {
    try {
      res.json(await authService.login(req.body.email, req.body.password));
    } catch (err) { next(err); }
  },
};
```

- [ ] **Step 6: Create `auth.route.js`**

```js
import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { loginSchema } from "./auth.schema.js";
import { authController } from "./auth.controller.js";

export const authRouter = Router();
authRouter.post("/login", validate(loginSchema), authController.login);
```

- [ ] **Step 7: Mount in `app.js`**

Add the import at the top and mount after `express.json()` in `createApp()`:
```js
import { authRouter } from "./modules/auth/auth.route.js";
// ...
app.use("/api/auth", authRouter);
```
(Keep the `errorHandler` as the LAST `app.use` call.)

- [ ] **Step 8: Run test and commit**

Run: `npm test -w @blaze/api -- auth-login`
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): auth module with login route"
```

---

### Task 8: Coach seeder

**Files:**
- Create: `apps/api/src/db/seed.js`
- Test: `apps/api/tests/seed.test.js`

**Interfaces:**
- Consumes: `UserModel`, `hashPassword`, `config.seedCoach`, `sequelize`.
- Produces: `seedCoach() -> Promise<UserModel>` — idempotent (no duplicate coach). Running the file directly seeds then closes the connection.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/seed.test.js`:
```js
import { describe, it, expect, beforeAll } from "vitest";
import { sequelize } from "../src/lib/db.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { seedCoach } from "../src/db/seed.js";

describe("seedCoach", () => {
  beforeAll(async () => { await sequelize.sync({ force: true }); });
  it("creates one coach and is idempotent", async () => {
    await seedCoach();
    await seedCoach();
    const coaches = await UserModel.findAll({ where: { role: "coach" } });
    expect(coaches.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/api -- seed`
Expected: FAIL ("Cannot find module ../src/db/seed.js").

- [ ] **Step 3: Create `apps/api/src/db/seed.js`**

```js
import { sequelize } from "../lib/db.js";
import { UserModel } from "../modules/users/users.model.js";
import { hashPassword } from "../lib/password.js";
import { config } from "../config.js";

export async function seedCoach() {
  const existing = await UserModel.findOne({ where: { email: config.seedCoach.email } });
  if (existing) return existing;
  return UserModel.create({
    role: "coach",
    email: config.seedCoach.email,
    name: config.seedCoach.name,
    locale: "es",
    passwordHash: await hashPassword(config.seedCoach.password),
  });
}

// Allow running directly: `npm run seed`
if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  seedCoach().then(() => sequelize.close()).then(() => console.log("Coach seeded"));
}
```

- [ ] **Step 4: Run test and commit**

Run: `npm test -w @blaze/api -- seed`
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): idempotent coach seeder"
```

---

### Task 9: Invitations module (create + accept)

**Files:**
- Create: `apps/api/src/modules/invitations/invitations.model.js`, `invitations.schema.js`, `invitations.service.js`, `invitations.controller.js`, `invitations.route.js`, `apps/api/src/modules/coaching/coachClients.model.js`
- Modify: `apps/api/src/app.js`
- Test: `apps/api/tests/invitations.test.js`

**Interfaces:**
- Consumes: `UserModel`, `hashPassword`, `acceptInviteSchema`, `authGuard`, `roleGuard`, `signAccess`, `signRefresh`, `authService.toUser`, `HttpError`.
- Produces: `InvitationModel` (`id, coachId, email, token, status, expiresAt`); `CoachClientModel` (`id, coachId, clientId`); `invitationsService.create(coachId, email)`, `invitationsService.preview(token)`, `invitationsService.accept(token, name, password)`; routers `coachInvitationsRouter` (mounted at `/api/coach`) and `inviteAcceptRouter` (mounted at `/api/auth`).

- [ ] **Step 1: Write the failing test**

`apps/api/tests/invitations.test.js`:
```js
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";
import { seedCoach } from "../src/db/seed.js";
import { signAccess } from "../src/lib/jwt.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { CoachClientModel } from "../src/modules/coaching/coachClients.model.js";

describe("invitations flow", () => {
  let coachToken;
  let coachId;
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    const coach = await seedCoach();
    coachId = coach.id;
    coachToken = signAccess({ sub: coach.id, role: "coach" });
  });

  it("coach creates an invitation and client accepts it", async () => {
    const app = createApp();
    const inv = await request(app).post("/api/coach/invitations")
      .set("Authorization", `Bearer ${coachToken}`).send({ email: "client@x.com" });
    expect(inv.status).toBe(201);
    const token = inv.body.token;

    const preview = await request(app).get(`/api/auth/invitations/${token}`);
    expect(preview.body.email).toBe("client@x.com");

    const accepted = await request(app).post(`/api/auth/invitations/${token}/accept`)
      .send({ name: "New Client", password: "secret12" });
    expect(accepted.status).toBe(201);
    expect(accepted.body.user.role).toBe("client");

    const client = await UserModel.findOne({ where: { email: "client@x.com" } });
    const link = await CoachClientModel.findOne({ where: { clientId: client.id } });
    expect(link.coachId).toBe(coachId);
  });

  it("rejects accepting an already-accepted invitation", async () => {
    const app = createApp();
    const inv = await request(app).post("/api/coach/invitations")
      .set("Authorization", `Bearer ${coachToken}`).send({ email: "two@x.com" });
    const token = inv.body.token;
    await request(app).post(`/api/auth/invitations/${token}/accept`).send({ name: "A", password: "secret12" });
    const second = await request(app).post(`/api/auth/invitations/${token}/accept`).send({ name: "B", password: "secret12" });
    expect(second.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/api -- invitations`
Expected: FAIL (modules/routes missing).

- [ ] **Step 3: Create `coaching/coachClients.model.js`**

```js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class CoachClientModel extends Model {}

CoachClientModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    coachId: { type: DataTypes.UUID, allowNull: false },
    clientId: { type: DataTypes.UUID, allowNull: false },
  },
  {
    sequelize, tableName: "coach_clients", underscored: true,
    indexes: [{ unique: true, fields: ["coach_id", "client_id"] }],
  },
);
```

- [ ] **Step 4: Create `invitations/invitations.model.js`**

```js
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class InvitationModel extends Model {}

InvitationModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    coachId: { type: DataTypes.UUID, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.ENUM("pending", "accepted", "expired"), allowNull: false, defaultValue: "pending" },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: "invitations", underscored: true },
);
```

- [ ] **Step 5: Create `invitations/invitations.schema.js`**

```js
import { z } from "zod";
export { acceptInviteSchema } from "@blaze/shared";
export const createInviteSchema = z.object({ email: z.string().email() });
```

- [ ] **Step 6: Create `invitations/invitations.service.js`**

```js
import { randomBytes } from "node:crypto";
import { InvitationModel } from "./invitations.model.js";
import { UserModel } from "../users/users.model.js";
import { CoachClientModel } from "../coaching/coachClients.model.js";
import { hashPassword } from "../../lib/password.js";
import { signAccess, signRefresh } from "../../lib/jwt.js";
import { authService } from "../auth/auth.service.js";
import { HttpError } from "../../middleware/error.js";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export const invitationsService = {
  async create(coachId, email) {
    return InvitationModel.create({
      coachId, email,
      token: randomBytes(24).toString("hex"),
      expiresAt: new Date(Date.now() + THIRTY_DAYS),
    });
  },

  async preview(token) {
    const inv = await InvitationModel.findOne({ where: { token } });
    if (!inv || inv.status !== "pending") throw new HttpError(404, "Invitation not found");
    const coach = await UserModel.findByPk(inv.coachId);
    return { email: inv.email, coachName: coach ? coach.name : "" };
  },

  async accept(token, name, password) {
    const inv = await InvitationModel.findOne({ where: { token } });
    if (!inv || inv.status !== "pending" || inv.expiresAt < new Date()) {
      throw new HttpError(400, "Invitation is not valid");
    }
    const client = await UserModel.create({
      role: "client", email: inv.email, name, locale: "es",
      passwordHash: await hashPassword(password),
    });
    await CoachClientModel.create({ coachId: inv.coachId, clientId: client.id });
    inv.status = "accepted";
    await inv.save();
    const payload = { sub: client.id, role: client.role };
    return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: authService.toUser(client) };
  },
};
```

- [ ] **Step 7: Create `invitations/invitations.controller.js`**

```js
import { invitationsService } from "./invitations.service.js";

export const invitationsController = {
  async create(req, res, next) {
    try {
      const inv = await invitationsService.create(req.user.sub, req.body.email);
      res.status(201).json({ id: inv.id, token: inv.token, email: inv.email });
    } catch (err) { next(err); }
  },
  async preview(req, res, next) {
    try { res.json(await invitationsService.preview(req.params.token)); }
    catch (err) { next(err); }
  },
  async accept(req, res, next) {
    try {
      res.status(201).json(await invitationsService.accept(req.params.token, req.body.name, req.body.password));
    } catch (err) { next(err); }
  },
};
```

- [ ] **Step 8: Create `invitations/invitations.route.js`**

```js
import { Router } from "express";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { acceptInviteSchema, createInviteSchema } from "./invitations.schema.js";
import { invitationsController } from "./invitations.controller.js";

// Coach-scoped router → mounted at /api/coach
export const coachInvitationsRouter = Router();
coachInvitationsRouter.post("/invitations", authGuard, roleGuard("coach"),
  validate(createInviteSchema), invitationsController.create);

// Public invite acceptance → mounted at /api/auth
export const inviteAcceptRouter = Router();
inviteAcceptRouter.get("/invitations/:token", invitationsController.preview);
inviteAcceptRouter.post("/invitations/:token/accept",
  validate(acceptInviteSchema), invitationsController.accept);
```

- [ ] **Step 9: Mount routers in `app.js`**

Add imports at top and mount (keep `errorHandler` last):
```js
import { coachInvitationsRouter, inviteAcceptRouter } from "./modules/invitations/invitations.route.js";
// inside createApp(), after authRouter:
app.use("/api/auth", inviteAcceptRouter);
app.use("/api/coach", coachInvitationsRouter);
```

- [ ] **Step 10: Run test and commit**

Run: `npm test -w @blaze/api -- invitations`
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): invitation create + accept onboarding flow"
```

---

### Task 10: R2 + sharp storage helper

**Files:**
- Create: `apps/api/src/lib/storage.js`
- Test: `apps/api/tests/storage.test.js`

**Interfaces:**
- Consumes: `config.r2`.
- Produces: `makeThumbnail(buffer) -> Promise<Buffer>`; `putObject(key, body, contentType)`; `getObject(key) -> { body, contentType }`; `deleteObject(key)`; `buildKey(prefix, ext) -> string`. The R2 client is created lazily so `makeThumbnail`/`buildKey` work in tests without network/credentials.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/storage.test.js`:
```js
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { makeThumbnail, buildKey } from "../src/lib/storage.js";

describe("storage helper", () => {
  it("buildKey returns a unique prefixed key", () => {
    const k1 = buildKey("meals", "jpg");
    const k2 = buildKey("meals", "jpg");
    expect(k1).toMatch(/^meals\/.+\.jpg$/);
    expect(k1).not.toBe(k2);
  });

  it("makeThumbnail shrinks an image", async () => {
    const src = await sharp({ create: { width: 800, height: 800, channels: 3, background: "red" } })
      .jpeg().toBuffer();
    const thumb = await makeThumbnail(src);
    const meta = await sharp(thumb).metadata();
    expect(meta.width).toBeLessThanOrEqual(320);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/api -- storage`
Expected: FAIL ("Cannot find module ../src/lib/storage.js").

- [ ] **Step 3: Create `apps/api/src/lib/storage.js`**

```js
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config.js";

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
  await r2().send(new PutObjectCommand({ Bucket: config.r2.bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key) {
  const out = await r2().send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }));
  return { body: out.Body, contentType: out.ContentType };
}

export async function deleteObject(key) {
  await r2().send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
}
```

- [ ] **Step 4: Run test and commit**

Run: `npm test -w @blaze/api -- storage`
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): R2 storage helper with sharp thumbnails"
```

---

### Task 11: Frontend scaffold (Vite + Tailwind + tokens + fonts)

**Files:**
- Create: `apps/web/package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/test-setup.js`, `src/styles/tokens.css`
- Test: `apps/web/src/App.test.jsx`

**Interfaces:**
- Produces: a rendering React app exposing Tailwind theme colors `primary`, `ink`, `success`, `danger` and fonts `heading`, `body`. Vitest configured with jsdom.

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@blaze/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@blaze/shared": "*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "react-i18next": "^15.0.0",
    "i18next": "^23.12.0",
    "lucide-react": "^0.424.0",
    "@fontsource/barlow": "^5.0.0",
    "@fontsource/barlow-condensed": "^5.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.3.0",
    "vite-plugin-pwa": "^0.20.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^2.0.0",
    "jsdom": "^24.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0"
  }
}
```

- [ ] **Step 2: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
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

- [ ] **Step 3: Create `postcss.config.js`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 4: Create `src/styles/tokens.css`**

```css
@import "@fontsource/barlow-condensed/600.css";
@import "@fontsource/barlow-condensed/700.css";
@import "@fontsource/barlow/400.css";
@import "@fontsource/barlow/500.css";
@tailwind base;
@tailwind components;
@tailwind utilities;

body { @apply font-body text-ink bg-white; }
```

- [ ] **Step 5: Create `vite.config.js` and `src/test-setup.js`**

`vite.config.js`:
```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./src/test-setup.js"] },
});
```

`src/test-setup.js`:
```js
import "@testing-library/jest-dom";
```

- [ ] **Step 6: Create `index.html`, `src/main.jsx`, `src/App.jsx`**

`index.html`:
```html
<!doctype html>
<html lang="es">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Blaze Lifestyle</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>
```

`src/App.jsx`:
```jsx
export default function App() {
  return <h1 className="font-heading uppercase tracking-wide text-primary">Blaze Lifestyle</h1>;
}
```

`src/main.jsx`:
```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
```

- [ ] **Step 7: Write the failing test**

`src/App.test.jsx`:
```jsx
import { render, screen } from "@testing-library/react";
import App from "./App.jsx";

it("renders the brand", () => {
  render(<App />);
  expect(screen.getByText("Blaze Lifestyle")).toBeInTheDocument();
});
```

- [ ] **Step 8: Run test and commit**

Run: `npm install && npm test -w @blaze/web`
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): vite + tailwind scaffold with Blaze tokens"
```

---

### Task 12: i18n (ES/EN) + Button primitive

**Files:**
- Create: `apps/web/src/lib/i18n.js`, `apps/web/src/locales/es.json`, `apps/web/src/locales/en.json`, `apps/web/src/components/Button.jsx`
- Modify: `apps/web/src/main.jsx` (import i18n)
- Test: `apps/web/src/components/Button.test.jsx`

**Interfaces:**
- Produces: configured `i18n` instance (default `es`, fallback `en`); `<Button variant="primary"|"secondary">` styled with Blaze tokens, `active:scale-95`, min height 44px.

- [ ] **Step 1: Create `src/locales/es.json` and `en.json`**

`es.json`:
```json
{ "auth": { "login": "Iniciar sesión", "email": "Correo", "password": "Contraseña" } }
```
`en.json`:
```json
{ "auth": { "login": "Log in", "email": "Email", "password": "Password" } }
```

- [ ] **Step 2: Create `src/lib/i18n.js`**

```js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "../locales/es.json";
import en from "../locales/en.json";

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: "es",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
```

Add `import "./lib/i18n.js";` to `src/main.jsx` (after the tokens.css import).

- [ ] **Step 3: Write the failing test**

`src/components/Button.test.jsx`:
```jsx
import { render, screen } from "@testing-library/react";
import { Button } from "./Button.jsx";

it("renders a primary button with min touch height", () => {
  render(<Button variant="primary">GUARDAR</Button>);
  const btn = screen.getByRole("button", { name: "GUARDAR" });
  expect(btn).toHaveClass("min-h-[44px]");
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npm test -w @blaze/web -- Button`
Expected: FAIL ("Cannot find module ./Button.jsx").

- [ ] **Step 5: Create `src/components/Button.jsx`**

```jsx
const base =
  "min-h-[44px] px-4 font-heading uppercase tracking-wide border-2 rounded-none transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:active:scale-100";
const variants = {
  primary: "bg-primary text-white border-primary",
  secondary: "bg-white text-ink border-ink",
};

export function Button({ variant = "primary", className = "", ...rest }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}
```

- [ ] **Step 6: Run test and commit**

Run: `npm test -w @blaze/web -- Button`
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): i18n setup and Button primitive"
```

---

### Task 13: API client + Auth context + role-based router + Login screen

**Files:**
- Create: `apps/web/src/lib/api.js`, `apps/web/src/lib/auth.jsx`, `apps/web/src/app/router.jsx`, `apps/web/src/features/auth/LoginScreen.jsx`
- Modify: `apps/web/src/App.jsx` (render router)
- Test: `apps/web/src/features/auth/LoginScreen.test.jsx`

**Interfaces:**
- Consumes: `Button`, `i18n` (translations under `auth.*`).
- Produces: `api.get(path)` / `api.post(path, body)` (attaches bearer token from `localStorage`); `AuthProvider` + `useAuth()` returning `{ user, login, logout }`; `router` with a public `/login`, a role redirect at `/`, and placeholder `/home` (client) and `/coach` routes.

- [ ] **Step 1: Create `src/lib/api.js`**

```js
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function token() { return localStorage.getItem("accessToken"); }

async function call(method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? res.statusText);
  }
  return res.json();
}

export const api = {
  get: (p) => call("GET", p),
  post: (p, b) => call("POST", p, b),
};
```

- [ ] **Step 2: Create `src/lib/auth.jsx`**

```jsx
import { createContext, useContext, useState } from "react";
import { api } from "./api.js";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);
    localStorage.setItem("user", JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  }
  function logout() {
    localStorage.clear();
    setUser(null);
  }
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 3: Write the failing test**

`src/features/auth/LoginScreen.test.jsx`:
```jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../lib/auth.jsx";
import { LoginScreen } from "./LoginScreen.jsx";
import "../../lib/i18n.js";

it("renders email, password fields and a login button", () => {
  render(
    <MemoryRouter><AuthProvider><LoginScreen /></AuthProvider></MemoryRouter>
  );
  expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npm test -w @blaze/web -- LoginScreen`
Expected: FAIL ("Cannot find module ./LoginScreen.jsx").

- [ ] **Step 5: Create `src/features/auth/LoginScreen.jsx`**

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth.jsx";
import { Button } from "../../components/Button.jsx";

export function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(email, password);
      navigate(user.role === "coach" ? "/coach" : "/home");
    } catch {
      setError("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-[430px] p-4 space-y-4">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{t("auth.login")}</h1>
      <label className="block">
        <span className="font-heading uppercase text-sm">{t("auth.email")}</span>
        <input aria-label={t("auth.email")} type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border-2 border-ink rounded-none" />
      </label>
      <label className="block">
        <span className="font-heading uppercase text-sm">{t("auth.password")}</span>
        <input aria-label={t("auth.password")} type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border-2 border-ink rounded-none" />
      </label>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full">{t("auth.login")}</Button>
    </form>
  );
}
```

- [ ] **Step 6: Create `src/app/router.jsx`**

```jsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { LoginScreen } from "../features/auth/LoginScreen.jsx";

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "coach" ? "/coach" : "/home"} replace />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginScreen /> },
  { path: "/", element: <RoleHome /> },
  { path: "/home", element: <div className="p-4 font-heading uppercase">Client home (next plan)</div> },
  { path: "/coach", element: <div className="p-4 font-heading uppercase">Coach panel (next plan)</div> },
]);
```

- [ ] **Step 7: Render router in `App.jsx`**

```jsx
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./lib/auth.jsx";
import { router } from "./app/router.jsx";

export default function App() {
  return (
    <AuthProvider><RouterProvider router={router} /></AuthProvider>
  );
}
```

(Update `src/App.test.jsx`: the old "renders the brand" assertion no longer holds once `App` renders the router. Replace it with a render smoke test that wraps in nothing extra — `App` provides its own providers — and asserts the login route is reachable, e.g. render `<App />` and assert `screen.getByRole("button", { name: /iniciar sesión/i })` is present after navigating to `/login`. Keep it minimal.)

- [ ] **Step 8: Run test and commit**

Run: `npm test -w @blaze/web -- LoginScreen`
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): api client, auth context, role router, login screen"
```

---

### Task 14: PWA manifest + service worker

**Files:**
- Create: `apps/web/public/manifest.webmanifest`, icon placeholders `apps/web/public/icon-192.png`, `apps/web/public/icon-512.png`
- Modify: `apps/web/vite.config.js` (add `vite-plugin-pwa`), `index.html` (manifest link, theme-color)

**Interfaces:**
- Produces: an installable PWA (build emits a service worker + manifest). No new runtime API.

- [ ] **Step 1: Create `public/manifest.webmanifest`**

```json
{
  "name": "Blaze Lifestyle",
  "short_name": "Blaze",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#FF3C00",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Add PWA plugin to `vite.config.js`**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ registerType: "autoUpdate", manifest: false, includeAssets: ["icon-192.png", "icon-512.png"] }),
  ],
  test: { environment: "jsdom", globals: true, setupFiles: ["./src/test-setup.js"] },
});
```

- [ ] **Step 3: Link manifest + theme color in `index.html`**

Add inside `<head>`:
```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#FF3C00" />
```

- [ ] **Step 4: Add placeholder PNG icons**

Create solid `#FF3C00` PNGs at 192×192 and 512×512. Quick one-off using the already-installed `sharp` (run from `apps/web`):
```bash
node -e "const s=require('sharp');['192','512'].forEach(n=>s({create:{width:+n,height:+n,channels:3,background:'#FF3C00'}}).png().toFile('public/icon-'+n+'.png'))"
```
(They are replaced with real branding later.)

- [ ] **Step 5: Verify build and commit**

Run: `npm run build -w @blaze/web`
Expected: build succeeds; `dist/` contains `sw.js` and `manifest.webmanifest`.

```bash
git add -A
git commit -m "feat(web): installable PWA manifest and service worker"
```

---

## Self-Review

**Spec coverage (Foundation phase):**
- Monorepo `apps/web`, `apps/api`, `packages/shared` → Tasks 1–3, 11. ✓
- JavaScript ESM everywhere (no TypeScript) → Global Constraints; all task code is `.js`/`.jsx`. ✓
- Backend module layering (model/schema/service/controller/route) → Tasks 7, 9 establish the pattern. ✓
- Sequelize + PostgreSQL → Task 4. ✓
- Auth (JWT, login, guards) → Tasks 5–7. ✓
- Invitation-based onboarding + coach↔client link → Task 9. ✓
- Single coach seeded → Task 8. ✓
- R2 + sharp private photo storage → Task 10. ✓
- Frontend shell: Tailwind tokens + Barlow fonts → Task 11; i18n ES/EN → Task 12; design-system Button → Task 12; role-based router + auth + login → Task 13; PWA → Task 14. ✓
- Two-layer authorization: `roleGuard` provided now; per-resource ownership checks land with the data modules in later plans. ✓

**Out of scope here (next plans):** meal plans, meal entries + photo upload endpoints, client timeline/entry screens, coach panel screens, compliance confirmation, metrics.

**Placeholder scan:** none — every step contains runnable code or an exact command.

**Type/name consistency:** token payload `{ sub, role }` used consistently across `jwt.js`, `auth.js` middleware, services. `authService.toUser` reused by invitations service. Auth responses share the `{ accessToken, refreshToken, user }` shape across login and invite-accept. Local ESM imports use explicit `.js`/`.jsx` extensions throughout. Task 1 is already complete; this plan resumes at Task 2.
