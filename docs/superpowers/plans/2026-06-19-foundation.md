# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Blaze Lifestyle monorepo with a working Express+PostgreSQL API (auth, invitation-based onboarding, R2 photo storage helper) and a React+Vite PWA shell (router, i18n, design system), so the Nutrition feature plans can build on it.

**Architecture:** npm workspaces monorepo with `apps/api` (Express + Sequelize + PostgreSQL), `apps/web` (React + Vite + Tailwind), and `packages/shared` (TypeScript types, enums, Zod schemas shared by both). The API is organized by module using a strict Model · Schema · Service · Controller · Route layering. Auth is JWT-based; the single coach is seeded; clients join via invitation links.

**Tech Stack:** TypeScript, Express, Sequelize, PostgreSQL, Zod, jsonwebtoken, bcrypt, @aws-sdk/client-s3 (Cloudflare R2), sharp, React, Vite, Tailwind CSS, React Router, react-i18next, Vitest, Supertest.

## Global Constraints

- **Backend module layering:** every API module lives in `apps/api/src/modules/<name>/` with files `<name>.model.ts`, `<name>.schema.ts`, `<name>.service.ts`, `<name>.controller.ts`, `<name>.route.ts`. Controllers stay thin; business logic lives in services (no `req`/`res` in services).
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
tsconfig.base.json
packages/shared/
  package.json
  src/index.ts                       # re-exports
  src/enums.ts                       # Role, Locale, MealCategory, Compliance
  src/types.ts                       # User, AuthResponse, etc.
  src/schemas.ts                     # shared Zod schemas (login, accept-invite)
apps/api/
  package.json
  tsconfig.json
  .env.example
  src/config.ts                      # env parsing
  src/lib/db.ts                      # Sequelize instance
  src/lib/storage.ts                 # R2 + sharp helper
  src/lib/jwt.ts                     # sign/verify access+refresh
  src/lib/password.ts                # hash/compare
  src/middleware/error.ts            # central error handler
  src/middleware/validate.ts         # Zod validation middleware
  src/middleware/auth.ts             # authGuard + roleGuard
  src/modules/users/users.model.ts
  src/modules/auth/auth.schema.ts
  src/modules/auth/auth.service.ts
  src/modules/auth/auth.controller.ts
  src/modules/auth/auth.route.ts
  src/modules/invitations/invitations.model.ts
  src/modules/invitations/invitations.schema.ts
  src/modules/invitations/invitations.service.ts
  src/modules/invitations/invitations.controller.ts
  src/modules/invitations/invitations.route.ts
  src/modules/coaching/coachClients.model.ts
  src/db/seed.ts                     # seeds the single coach
  src/app.ts                         # express app factory
  src/server.ts                      # listen
  tests/*.test.ts
apps/web/
  package.json
  vite.config.ts
  tailwind.config.js
  index.html
  public/manifest.webmanifest
  src/main.tsx
  src/styles/tokens.css
  src/lib/i18n.ts
  src/lib/api.ts
  src/lib/auth.tsx                   # AuthProvider + useAuth
  src/components/Button.tsx
  src/app/router.tsx
  src/features/auth/LoginScreen.tsx
```

---

### Task 1: Monorepo scaffold

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `packages/shared/package.json`, `packages/shared/src/index.ts`

**Interfaces:**
- Produces: npm workspaces resolving `@blaze/shared`, `@blaze/api`, `@blaze/web`.

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "blaze-lifestyle",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "test": "npm run test --workspaces --if-present"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 3: Create `packages/shared/package.json`**

```json
{
  "name": "@blaze/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": { "zod": "^3.23.8" }
}
```

- [ ] **Step 4: Create `packages/shared/src/index.ts`**

```ts
export * from "./enums";
export * from "./types";
export * from "./schemas";
```

- [ ] **Step 5: Install and commit**

Run: `npm install`
Expected: workspaces linked, no errors.

```bash
git add -A
git commit -m "chore: monorepo workspace scaffold"
```

---

### Task 2: Shared enums, types, and schemas

**Files:**
- Create: `packages/shared/src/enums.ts`, `packages/shared/src/types.ts`, `packages/shared/src/schemas.ts`
- Test: `packages/shared/src/schemas.test.ts`

**Interfaces:**
- Produces: `ROLES`, `LOCALES`, `MEAL_CATEGORIES`, `COMPLIANCE`; types `Role`, `Locale`, `User`, `AuthResponse`; schemas `loginSchema`, `acceptInviteSchema`.

- [ ] **Step 1: Write the failing test**

`packages/shared/src/schemas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { loginSchema, acceptInviteSchema } from "./schemas";

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

- [ ] **Step 2: Add Vitest to shared and run to verify failure**

Add to `packages/shared/package.json` scripts: `"test": "vitest run"` and devDependency `"vitest": "^2.0.0"`. Run: `npm install`.
Run: `npm test -w @blaze/shared`
Expected: FAIL ("Cannot find module ./schemas").

- [ ] **Step 3: Create `enums.ts`**

```ts
export const ROLES = ["client", "coach"] as const;
export type Role = (typeof ROLES)[number];

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const MEAL_CATEGORIES = [
  "Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement",
] as const;
export type MealCategory = (typeof MEAL_CATEGORIES)[number];

export const COMPLIANCE = ["yes", "no", "na"] as const;
export type Compliance = (typeof COMPLIANCE)[number];
```

- [ ] **Step 4: Create `types.ts`**

```ts
import type { Role, Locale } from "./enums";

export interface User {
  id: string;
  role: Role;
  email: string;
  name: string;
  locale: Locale;
  active: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
```

- [ ] **Step 5: Create `schemas.ts`**

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const acceptInviteSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(8),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
```

- [ ] **Step 6: Run tests and commit**

Run: `npm test -w @blaze/shared`
Expected: PASS.

```bash
git add -A
git commit -m "feat(shared): enums, types, and auth schemas"
```

---

### Task 3: API skeleton + health endpoint

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/.env.example`, `apps/api/src/config.ts`, `apps/api/src/middleware/error.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`
- Test: `apps/api/tests/health.test.ts`

**Interfaces:**
- Produces: `createApp(): Express` (used by all integration tests and `server.ts`); `config` object with typed env.

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "@blaze/api",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "test": "vitest run",
    "seed": "tsx src/db/seed.ts"
  },
  "dependencies": {
    "@blaze/shared": "*",
    "express": "^4.19.2",
    "sequelize": "^6.37.3",
    "pg": "^8.12.0",
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
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "supertest": "^7.0.0",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/bcryptjs": "^2.4.6",
    "@types/multer": "^1.4.11",
    "@types/supertest": "^6.0.2",
    "@types/cors": "^2.8.17"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `apps/api/.env.example`**

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

- [ ] **Step 4: Create `apps/api/src/config.ts`**

```ts
import "dotenv/config";

function required(name: string): string {
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

- [ ] **Step 5: Create `apps/api/src/middleware/error.ts`**

```ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
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

- [ ] **Step 6: Write the failing test**

`apps/api/tests/health.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 7: Run to verify failure**

Run: `npm install && npm test -w @blaze/api`
Expected: FAIL ("Cannot find module ../src/app").

- [ ] **Step 8: Create `apps/api/src/app.ts`**

```ts
import express, { type Express } from "express";
import cors from "cors";
import { config } from "./config";
import { errorHandler } from "./middleware/error";

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: config.webOrigin, credentials: true }));
  app.use(express.json());
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 9: Create `apps/api/src/server.ts`**

```ts
import { createApp } from "./app";
import { config } from "./config";

createApp().listen(config.port, () => {
  console.log(`API listening on :${config.port}`);
});
```

- [ ] **Step 10: Run test and commit**

Run: `npm test -w @blaze/api`
Expected: PASS.
(For the test to load config, create `apps/api/.env` from `.env.example`.)

```bash
git add -A
git commit -m "feat(api): express app skeleton with health endpoint"
```

---

### Task 4: Database layer (Sequelize) + User model

**Files:**
- Create: `apps/api/src/lib/db.ts`, `apps/api/src/modules/users/users.model.ts`
- Test: `apps/api/tests/user-model.test.ts`

**Interfaces:**
- Consumes: `config.databaseUrl`.
- Produces: `sequelize` instance; `UserModel` with attributes `id, role, email, passwordHash, name, locale, active`; `initModels()` that wires models and returns them; `syncTestDb()` helper.

- [ ] **Step 1: Create `apps/api/src/lib/db.ts`**

```ts
import { Sequelize } from "sequelize";
import { config } from "../config";

export const sequelize = new Sequelize(config.databaseUrl, {
  dialect: "postgres",
  logging: false,
});
```

- [ ] **Step 2: Write the failing test**

`apps/api/tests/user-model.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { sequelize } from "../src/lib/db";
import { UserModel } from "../src/modules/users/users.model";

describe("UserModel", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });
  it("creates a coach user", async () => {
    const u = await UserModel.create({
      role: "coach", email: "c@b.com", passwordHash: "x", name: "Coach", locale: "es",
    });
    expect(u.id).toBeTruthy();
    expect(u.active).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -w @blaze/api -- user-model`
Expected: FAIL ("Cannot find module ...users.model").

- [ ] **Step 4: Create `apps/api/src/modules/users/users.model.ts`**

```ts
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../../lib/db";

export class UserModel extends Model<InferAttributes<UserModel>, InferCreationAttributes<UserModel>> {
  declare id: CreationOptional<string>;
  declare role: "client" | "coach";
  declare email: string;
  declare passwordHash: string;
  declare name: string;
  declare locale: CreationOptional<"es" | "en">;
  declare active: CreationOptional<boolean>;
}

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
Expected: PASS (requires a running PostgreSQL at `DATABASE_URL`).

```bash
git add -A
git commit -m "feat(api): sequelize db layer and user model"
```

---

### Task 5: Password + JWT libs

**Files:**
- Create: `apps/api/src/lib/password.ts`, `apps/api/src/lib/jwt.ts`
- Test: `apps/api/tests/auth-lib.test.ts`

**Interfaces:**
- Produces: `hashPassword(pw): Promise<string>`, `verifyPassword(pw, hash): Promise<boolean>`; `signAccess(payload)`, `signRefresh(payload)`, `verifyAccess(token): TokenPayload`, where `TokenPayload = { sub: string; role: Role }`.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/auth-lib.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { signAccess, verifyAccess } from "../src/lib/jwt";

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
Expected: FAIL ("Cannot find module ../src/lib/password").

- [ ] **Step 3: Create `apps/api/src/lib/password.ts`**

```ts
import bcrypt from "bcryptjs";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
```

- [ ] **Step 4: Create `apps/api/src/lib/jwt.ts`**

```ts
import jwt from "jsonwebtoken";
import type { Role } from "@blaze/shared";
import { config } from "../config";

export interface TokenPayload { sub: string; role: Role; }

export const signAccess = (p: TokenPayload) =>
  jwt.sign(p, config.jwtAccessSecret, { expiresIn: "15m" });
export const signRefresh = (p: TokenPayload) =>
  jwt.sign(p, config.jwtRefreshSecret, { expiresIn: "30d" });
export const verifyAccess = (token: string): TokenPayload =>
  jwt.verify(token, config.jwtAccessSecret) as TokenPayload;
export const verifyRefresh = (token: string): TokenPayload =>
  jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
```

- [ ] **Step 5: Run test and commit**

Run: `npm test -w @blaze/api -- auth-lib`
Expected: PASS.

```bash
git add -A
git commit -m "feat(api): password hashing and jwt helpers"
```

---

### Task 6: Auth middleware (authGuard + roleGuard)

**Files:**
- Create: `apps/api/src/middleware/auth.ts`, `apps/api/src/middleware/validate.ts`
- Test: `apps/api/tests/auth-middleware.test.ts`

**Interfaces:**
- Consumes: `verifyAccess`, `HttpError`.
- Produces: `authGuard` (sets `req.user = { sub, role }`), `roleGuard(role)`, `validate(schema)`. Augments Express `Request` with `user?: TokenPayload`.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/auth-middleware.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { authGuard, roleGuard } from "../src/middleware/auth";
import { errorHandler } from "../src/middleware/error";
import { signAccess } from "../src/lib/jwt";

function appWith() {
  const app = express();
  app.get("/coach-only", authGuard, roleGuard("coach"), (req, res) =>
    res.json({ sub: req.user!.sub }));
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
Expected: FAIL ("Cannot find module ../src/middleware/auth").

- [ ] **Step 3: Create `apps/api/src/middleware/auth.ts`**

```ts
import type { Request, Response, NextFunction } from "express";
import type { Role } from "@blaze/shared";
import { verifyAccess, type TokenPayload } from "../lib/jwt";
import { HttpError } from "./error";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: TokenPayload; }
  }
}

export function authGuard(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new HttpError(401, "Unauthorized"));
  try {
    req.user = verifyAccess(header.slice(7));
    next();
  } catch {
    next(new HttpError(401, "Unauthorized"));
  }
}

export const roleGuard = (role: Role) => (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== role) return next(new HttpError(403, "Forbidden"));
  next();
};
```

- [ ] **Step 4: Create `apps/api/src/middleware/validate.ts`**

```ts
import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
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

### Task 7: Auth service + login/refresh routes

**Files:**
- Create: `apps/api/src/modules/auth/auth.schema.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.route.ts`
- Modify: `apps/api/src/app.ts` (mount `/api/auth`)
- Test: `apps/api/tests/auth-login.test.ts`

**Interfaces:**
- Consumes: `UserModel`, `verifyPassword`, `signAccess`, `signRefresh`, `loginSchema`.
- Produces: `authService.login(email, password): Promise<AuthResponse>`; routes `POST /api/auth/login`, `POST /api/auth/refresh`.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/auth-login.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { sequelize } from "../src/lib/db";
import { UserModel } from "../src/modules/users/users.model";
import { hashPassword } from "../src/lib/password";

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await UserModel.create({
      role: "coach", email: "c@b.com", name: "Coach", locale: "es",
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

- [ ] **Step 3: Create `auth.schema.ts`**

```ts
export { loginSchema, type LoginInput } from "@blaze/shared";
```

- [ ] **Step 4: Create `auth.service.ts`**

```ts
import type { AuthResponse, User } from "@blaze/shared";
import { UserModel } from "../users/users.model";
import { verifyPassword } from "../../lib/password";
import { signAccess, signRefresh } from "../../lib/jwt";
import { HttpError } from "../../middleware/error";

function toUser(m: UserModel): User {
  return { id: m.id, role: m.role, email: m.email, name: m.name, locale: m.locale, active: m.active };
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
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

- [ ] **Step 5: Create `auth.controller.ts`**

```ts
import type { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await authService.login(req.body.email, req.body.password));
    } catch (err) { next(err); }
  },
};
```

- [ ] **Step 6: Create `auth.route.ts`**

```ts
import { Router } from "express";
import { validate } from "../../middleware/validate";
import { loginSchema } from "./auth.schema";
import { authController } from "./auth.controller";

export const authRouter = Router();
authRouter.post("/login", validate(loginSchema), authController.login);
```

- [ ] **Step 7: Mount in `app.ts`**

Add after `express.json()` middleware in `createApp()`:
```ts
import { authRouter } from "./modules/auth/auth.route";
// ...
app.use("/api/auth", authRouter);
```

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
- Create: `apps/api/src/db/seed.ts`
- Test: `apps/api/tests/seed.test.ts`

**Interfaces:**
- Consumes: `UserModel`, `hashPassword`, `config.seedCoach`.
- Produces: `seedCoach(): Promise<UserModel>` — idempotent (no duplicate coach).

- [ ] **Step 1: Write the failing test**

`apps/api/tests/seed.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { sequelize } from "../src/lib/db";
import { UserModel } from "../src/modules/users/users.model";
import { seedCoach } from "../src/db/seed";

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
Expected: FAIL ("Cannot find module ../src/db/seed").

- [ ] **Step 3: Create `apps/api/src/db/seed.ts`**

```ts
import { sequelize } from "../lib/db";
import { UserModel } from "../modules/users/users.model";
import { hashPassword } from "../lib/password";
import { config } from "../config";

export async function seedCoach(): Promise<UserModel> {
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
if (process.argv[1]?.endsWith("seed.ts")) {
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
- Create: `apps/api/src/modules/invitations/invitations.model.ts`, `invitations.schema.ts`, `invitations.service.ts`, `invitations.controller.ts`, `invitations.route.ts`, `apps/api/src/modules/coaching/coachClients.model.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/tests/invitations.test.ts`

**Interfaces:**
- Consumes: `UserModel`, `hashPassword`, `acceptInviteSchema`, `authGuard`, `roleGuard`.
- Produces: `InvitationModel` (`id, coachId, email, token, status, expiresAt`); `CoachClientModel` (`id, coachId, clientId`); `invitationsService.create(coachId, email)`, `invitationsService.accept(token, name, password)`; routes `POST /api/coach/invitations` (coach), `GET /api/auth/invitations/:token`, `POST /api/auth/invitations/:token/accept`.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/invitations.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { sequelize } from "../src/lib/db";
import { seedCoach } from "../src/db/seed";
import { signAccess } from "../src/lib/jwt";
import { UserModel } from "../src/modules/users/users.model";
import { CoachClientModel } from "../src/modules/coaching/coachClients.model";

describe("invitations flow", () => {
  let coachToken: string;
  let coachId: string;
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
    const token = inv.body.token as string;

    const preview = await request(app).get(`/api/auth/invitations/${token}`);
    expect(preview.body.email).toBe("client@x.com");

    const accepted = await request(app).post(`/api/auth/invitations/${token}/accept`)
      .send({ name: "New Client", password: "secret12" });
    expect(accepted.status).toBe(201);
    expect(accepted.body.user.role).toBe("client");

    const client = await UserModel.findOne({ where: { email: "client@x.com" } });
    const link = await CoachClientModel.findOne({ where: { clientId: client!.id } });
    expect(link!.coachId).toBe(coachId);
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

- [ ] **Step 3: Create `coaching/coachClients.model.ts`**

```ts
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../../lib/db";

export class CoachClientModel extends Model<InferAttributes<CoachClientModel>, InferCreationAttributes<CoachClientModel>> {
  declare id: CreationOptional<string>;
  declare coachId: string;
  declare clientId: string;
}

CoachClientModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    coachId: { type: DataTypes.UUID, allowNull: false },
    clientId: { type: DataTypes.UUID, allowNull: false },
  },
  { sequelize, tableName: "coach_clients", underscored: true,
    indexes: [{ unique: true, fields: ["coach_id", "client_id"] }] },
);
```

- [ ] **Step 4: Create `invitations/invitations.model.ts`**

```ts
import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../../lib/db";

export class InvitationModel extends Model<InferAttributes<InvitationModel>, InferCreationAttributes<InvitationModel>> {
  declare id: CreationOptional<string>;
  declare coachId: string;
  declare email: string;
  declare token: string;
  declare status: CreationOptional<"pending" | "accepted" | "expired">;
  declare expiresAt: Date;
}

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

- [ ] **Step 5: Create `invitations/invitations.schema.ts`**

```ts
import { z } from "zod";
export { acceptInviteSchema } from "@blaze/shared";
export const createInviteSchema = z.object({ email: z.string().email() });
```

- [ ] **Step 6: Create `invitations/invitations.service.ts`**

```ts
import { randomBytes } from "node:crypto";
import type { AuthResponse } from "@blaze/shared";
import { InvitationModel } from "./invitations.model";
import { UserModel } from "../users/users.model";
import { CoachClientModel } from "../coaching/coachClients.model";
import { hashPassword } from "../../lib/password";
import { signAccess, signRefresh } from "../../lib/jwt";
import { authService } from "../auth/auth.service";
import { HttpError } from "../../middleware/error";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export const invitationsService = {
  async create(coachId: string, email: string): Promise<InvitationModel> {
    return InvitationModel.create({
      coachId, email,
      token: randomBytes(24).toString("hex"),
      expiresAt: new Date(Date.now() + THIRTY_DAYS),
    });
  },

  async preview(token: string) {
    const inv = await InvitationModel.findOne({ where: { token } });
    if (!inv || inv.status !== "pending") throw new HttpError(404, "Invitation not found");
    const coach = await UserModel.findByPk(inv.coachId);
    return { email: inv.email, coachName: coach?.name ?? "" };
  },

  async accept(token: string, name: string, password: string): Promise<AuthResponse> {
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

- [ ] **Step 7: Create `invitations/invitations.controller.ts`**

```ts
import type { Request, Response, NextFunction } from "express";
import { invitationsService } from "./invitations.service";

export const invitationsController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const inv = await invitationsService.create(req.user!.sub, req.body.email);
      res.status(201).json({ id: inv.id, token: inv.token, email: inv.email });
    } catch (err) { next(err); }
  },
  async preview(req: Request, res: Response, next: NextFunction) {
    try { res.json(await invitationsService.preview(req.params.token)); }
    catch (err) { next(err); }
  },
  async accept(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await invitationsService.accept(req.params.token, req.body.name, req.body.password));
    } catch (err) { next(err); }
  },
};
```

- [ ] **Step 8: Create `invitations/invitations.route.ts`**

```ts
import { Router } from "express";
import { authGuard, roleGuard } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { acceptInviteSchema, createInviteSchema } from "./invitations.schema";
import { invitationsController } from "./invitations.controller";

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

- [ ] **Step 9: Mount routers in `app.ts`**

```ts
import { coachInvitationsRouter, inviteAcceptRouter } from "./modules/invitations/invitations.route";
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
- Create: `apps/api/src/lib/storage.ts`
- Test: `apps/api/tests/storage.test.ts`

**Interfaces:**
- Consumes: `config.r2`.
- Produces: `makeThumbnail(buffer): Promise<Buffer>`; `putObject(key, body, contentType): Promise<void>`; `getObject(key): Promise<{ body: Readable; contentType?: string }>`; `deleteObject(key): Promise<void>`; `buildKey(prefix, ext): string`. R2 client is created lazily so tests can exercise `makeThumbnail`/`buildKey` without network.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/storage.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { makeThumbnail, buildKey } from "../src/lib/storage";

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
Expected: FAIL ("Cannot find module ../src/lib/storage").

- [ ] **Step 3: Create `apps/api/src/lib/storage.ts`**

```ts
import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config";

let client: S3Client | null = null;
function r2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: config.r2.endpoint,
      credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
    });
  }
  return client;
}

export const buildKey = (prefix: string, ext: string) => `${prefix}/${randomUUID()}.${ext}`;

export const makeThumbnail = (buffer: Buffer) =>
  sharp(buffer).resize(320, 320, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2().send(new PutObjectCommand({ Bucket: config.r2.bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key: string): Promise<{ body: Readable; contentType?: string }> {
  const out = await r2().send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }));
  return { body: out.Body as Readable, contentType: out.ContentType };
}

export async function deleteObject(key: string): Promise<void> {
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
- Create: `apps/web/package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles/tokens.css`
- Test: `apps/web/src/App.test.tsx`

**Interfaces:**
- Produces: a rendering React app exposing design tokens as Tailwind theme colors `primary`, `ink`, `success`, `danger` and fonts `heading`, `body`.

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
    "@testing-library/jest-dom": "^6.4.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
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
      borderRadius: { none: "0" },
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

:root { --color-primary: #FF3C00; }
body { @apply font-body text-ink bg-white; }
```

- [ ] **Step 5: Create `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./src/test-setup.ts"] },
});
```

Also create `src/test-setup.ts`:
```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 6: Create `index.html`, `src/main.tsx`, `src/App.tsx`**

`index.html`:
```html
<!doctype html>
<html lang="es">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Blaze Lifestyle</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

`src/App.tsx`:
```tsx
export default function App() {
  return <h1 className="font-heading uppercase tracking-wide text-primary">Blaze Lifestyle</h1>;
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
```

- [ ] **Step 7: Write the failing test**

`src/App.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import App from "./App";

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
- Create: `apps/web/src/lib/i18n.ts`, `apps/web/src/locales/es.json`, `apps/web/src/locales/en.json`, `apps/web/src/components/Button.tsx`
- Modify: `apps/web/src/main.tsx` (import i18n)
- Test: `apps/web/src/components/Button.test.tsx`

**Interfaces:**
- Produces: configured `i18n` instance (default `es`, fallback `en`); `<Button variant="primary"|"secondary">` styled with Blaze tokens, applies `active:scale-95`, min height 44px.

- [ ] **Step 1: Create `src/locales/es.json` and `en.json`**

`es.json`:
```json
{ "auth": { "login": "Iniciar sesión", "email": "Correo", "password": "Contraseña" } }
```
`en.json`:
```json
{ "auth": { "login": "Log in", "email": "Email", "password": "Password" } }
```

- [ ] **Step 2: Create `src/lib/i18n.ts`**

```ts
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

Add `import "./lib/i18n";` to `src/main.tsx`.

- [ ] **Step 3: Write the failing test**

`src/components/Button.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

it("renders a primary button with min touch height", () => {
  render(<Button variant="primary">GUARDAR</Button>);
  const btn = screen.getByRole("button", { name: "GUARDAR" });
  expect(btn).toHaveClass("min-h-[44px]");
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npm test -w @blaze/web -- Button`
Expected: FAIL ("Cannot find module ./Button").

- [ ] **Step 5: Create `src/components/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; }

const base = "min-h-[44px] px-4 font-heading uppercase tracking-wide border-2 rounded-none transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:active:scale-100";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-white border-primary",
  secondary: "bg-white text-ink border-ink",
};

export function Button({ variant = "primary", className = "", ...rest }: Props) {
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
- Create: `apps/web/src/lib/api.ts`, `apps/web/src/lib/auth.tsx`, `apps/web/src/app/router.tsx`, `apps/web/src/features/auth/LoginScreen.tsx`
- Modify: `apps/web/src/App.tsx` (render router)
- Test: `apps/web/src/features/auth/LoginScreen.test.tsx`

**Interfaces:**
- Consumes: `AuthResponse`, `User` from `@blaze/shared`; `Button`; `i18n`.
- Produces: `api.post/get(path, body?)` (attaches bearer token from storage); `AuthProvider` + `useAuth()` returning `{ user, login, logout }`; `router` with role-based trees (`coach` → `/coach/*`, `client` → `/*`) and a public `/login`.

- [ ] **Step 1: Create `src/lib/api.ts`**

```ts
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function token() { return localStorage.getItem("accessToken"); }

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

export const api = {
  get: (p: string) => call("GET", p),
  post: (p: string, b?: unknown) => call("POST", p, b),
};
```

- [ ] **Step 2: Create `src/lib/auth.tsx`**

```tsx
import { createContext, useContext, useState, type ReactNode } from "react";
import type { AuthResponse, User } from "@blaze/shared";
import { api } from "./api";

interface AuthCtx { user: User | null; login: (e: string, p: string) => Promise<User>; logout: () => void; }
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as User) : null;
  });

  async function login(email: string, password: string): Promise<User> {
    const res = (await api.post("/auth/login", { email, password })) as AuthResponse;
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

`src/features/auth/LoginScreen.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../lib/auth";
import { LoginScreen } from "./LoginScreen";
import "../../lib/i18n";

it("renders email, password fields and a login button", () => {
  render(<MemoryRouter><AuthProvider><LoginScreen /></AuthProvider></MemoryRouter>);
  expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npm test -w @blaze/web -- LoginScreen`
Expected: FAIL ("Cannot find module ./LoginScreen").

- [ ] **Step 5: Create `src/features/auth/LoginScreen.tsx`**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth";
import { Button } from "../../components/Button";

export function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(email, password);
      navigate(user.role === "coach" ? "/coach" : "/");
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

- [ ] **Step 6: Create `src/app/router.tsx`**

```tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LoginScreen } from "../features/auth/LoginScreen";

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

- [ ] **Step 7: Render router in `App.tsx`**

```tsx
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { router } from "./app/router";

export default function App() {
  return <AuthProvider><RouterProvider router={router} /></AuthProvider>;
}
```

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
- Modify: `apps/web/vite.config.ts` (add `vite-plugin-pwa`), `index.html` (manifest link, theme-color)

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

- [ ] **Step 2: Add PWA plugin to `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ registerType: "autoUpdate", manifest: false, includeAssets: ["icon-192.png", "icon-512.png"] }),
  ],
  test: { environment: "jsdom", globals: true, setupFiles: ["./src/test-setup.ts"] },
});
```

- [ ] **Step 3: Link manifest + theme color in `index.html`**

Add inside `<head>`:
```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#FF3C00" />
```

- [ ] **Step 4: Add placeholder PNG icons**

Create solid `#FF3C00` PNGs at 192×192 and 512×512 (any image tool, or a one-off `sharp` script). They are replaced with real branding later.

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
- Monorepo `apps/web`, `apps/api`, `packages/shared` → Tasks 1, 3, 11. ✓
- Backend module layering (model/schema/service/controller/route) → Tasks 7, 9 establish the pattern. ✓
- Sequelize + PostgreSQL → Task 4. ✓
- Auth (JWT, login, guards) → Tasks 5–7. ✓
- Invitation-based onboarding + coach↔client link → Task 9. ✓
- Single coach seeded → Task 8. ✓
- R2 + sharp private photo storage → Task 10. ✓
- Frontend shell: Tailwind tokens + Barlow fonts → Task 11; i18n ES/EN → Task 12; design-system Button → Task 12; role-based router + auth + login → Task 13; PWA → Task 14. ✓
- Two-layer authorization (role guard now; ownership checks land with data modules in later plans). ✓ (foundation provides `roleGuard`; ownership enforced per-resource in Nutrition/Coach plans)

**Out of scope here (next plans):** meal plans, meal entries + photo upload endpoints, client timeline/entry screens, coach panel screens, compliance confirmation, metrics. These build on the interfaces produced above.

**Placeholder scan:** none — every step contains runnable code or an exact command.

**Type consistency:** `TokenPayload = { sub, role }` used consistently across jwt, auth middleware, services. `authService.toUser` reused by invitations service. `AuthResponse`/`User` come from `@blaze/shared` on both ends.
