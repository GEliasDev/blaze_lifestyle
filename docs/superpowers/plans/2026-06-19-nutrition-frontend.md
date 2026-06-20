# Nutrition Frontend Implementation Plan (Plan B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the client nutrition screens and the coach/admin panel on top of the Nutrition API, making the app fully usable on mobile and desktop.

**Architecture:** React + Vite + Tailwind, role-based routing. Client = mobile-first centered column with a bottom nav. Coach = responsive; desktop master–detail (clients sidebar + content). Components consume the API via an extended `api` client; private photos load through an authenticated `AuthImage` that fetches the proxy with the bearer token and renders a blob URL. Brutalist Blaze identity (black top bar, `#FF3C00`, 2px borders, square corners, Barlow Condensed uppercase headings, Lucide icons).

**Tech Stack:** React, React Router, react-i18next, Tailwind, lucide-react, Vitest + Testing Library (api module mocked with `vi.mock`).

## Global Constraints

- **JavaScript ESM + JSX only** (`.jsx` components). Explicit local import extensions.
- **Design tokens, never hardcoded hex.** primary `#FF3C00` (`bg-primary`/`text-primary`/`border-primary`), ink `#000`, success `#22C55E`, danger `#EF4444`. Headings `font-heading uppercase tracking-wide`. 2px borders, `rounded-none`, no shadows. Touch targets ≥44px. Lucide icons only (no emoji).
- **i18n:** every user-facing string via `react-i18next` (`es`/`en`).
- **Auth:** all data routes wrapped in `RequireAuth`/`RequireRole`. Client touches `/api/me/*`; coach touches `/api/coach/*`.
- **Photos:** never put the token in an `<img src>` URL or a query string — load via `AuthImage` (fetch + blob URL).
- **TDD:** for each screen write a component test first (mock `../../lib/api.js`), watch it fail, implement, watch it pass. Keep tests focused (render + one key interaction); full data behavior is covered by the API suite.
- Categories: `Breakfast`, `AM Snack`, `Lunch`, `PM Snack`, `Dinner`, `Supplement`.

---

## File Structure (new under apps/web/src)

```
lib/api.js                      # MODIFY: query params, patch/del, postForm, blobUrl
lib/auth.jsx                    # MODIFY: logout removes only auth keys (not localStorage.clear)
app/router.jsx                  # MODIFY: RequireAuth/RequireRole + all nutrition + coach routes
components/AuthImage.jsx        # authed image loader (fetch → blob URL)
components/AppHeader.jsx        # black Blaze top bar (title, optional back)
components/BottomNav.jsx        # client bottom nav (timeline / add / plan)
components/Spinner.jsx          # tiny loading indicator
components/ComplianceBadge.jsx  # yes/no/na badge (color + icon + text)
locales/es.json, en.json        # MODIFY: nutrition + coach strings
features/nutrition/
  TimelineScreen.jsx            # client home
  AddEntryScreen.jsx            # client new entry (photos + fields)
  EntryDetailScreen.jsx         # client entry detail + coach comments
  MyPlanScreen.jsx              # client read-only plan + today
features/coach/
  CoachLayout.jsx               # responsive shell (sidebar on desktop)
  ClientsScreen.jsx             # clients list + invite
  ClientDetailScreen.jsx        # client metrics + timeline
  PlanEditorScreen.jsx          # weekly grid + dated items editor
  CoachEntryScreen.jsx          # review entry: comment + confirm compliance
```

---

### Task 1: API client, auth guards, shared UI primitives, i18n

**Files:**
- Modify: `apps/web/src/lib/api.js`, `apps/web/src/lib/auth.jsx`, `apps/web/src/locales/es.json`, `apps/web/src/locales/en.json`
- Create: `apps/web/src/components/{AuthImage,AppHeader,BottomNav,Spinner,ComplianceBadge}.jsx`
- Test: `apps/web/src/components/ComplianceBadge.test.jsx`

**Interfaces:**
- `api`: `get(path, query?)`, `post(path, body?)`, `patch(path, body?)`, `del(path)`, `postForm(path, formData)`, `blobUrl(path)`.
- `<AuthImage path className alt>` fetches `path` via `api.blobUrl` and renders an `<img>`.
- `<AppHeader title? showBack?>`, `<BottomNav>`, `<Spinner>`, `<ComplianceBadge value>` (`yes|no|na`).

- [ ] **Step 1: Rewrite `lib/api.js`**

```js
const BASE = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:4000`;

function token() { return localStorage.getItem("accessToken"); }
function authHeaders(extra = {}) {
  const t = token();
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra };
}

async function call(method, path, { body, form, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : "";
  const opts = { method, headers: authHeaders() };
  if (form) opts.body = form; // FormData: browser sets multipart boundary
  else if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  const res = await fetch(`${BASE}/api${path}${qs}`, opts);
  if (res.status === 204) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? res.statusText);
  }
  return res.json();
}

export const api = {
  get: (p, query) => call("GET", p, { query }),
  post: (p, body) => call("POST", p, { body }),
  patch: (p, body) => call("PATCH", p, { body }),
  del: (p) => call("DELETE", p),
  postForm: (p, form) => call("POST", p, { form }),
  async blobUrl(path) {
    const res = await fetch(`${BASE}/api${path}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("image failed");
    return URL.createObjectURL(await res.blob());
  },
};
```

- [ ] **Step 2: Fix `lib/auth.jsx` logout** (remove only auth keys, not the whole store)

Replace the `logout` function body with:
```js
  function logout() {
    ["accessToken", "refreshToken", "user"].forEach((k) => localStorage.removeItem(k));
    setUser(null);
  }
```

- [ ] **Step 3: Add nutrition + coach strings to locales**

`es.json` (merge, keep existing `auth`):
```json
{
  "auth": { "login": "Iniciar sesión", "email": "Correo", "password": "Contraseña", "error": "Credenciales inválidas", "logout": "Salir" },
  "nav": { "timeline": "Diario", "add": "Agregar", "plan": "Mi plan" },
  "category": { "Breakfast": "Desayuno", "AM Snack": "Snack AM", "Lunch": "Almuerzo", "PM Snack": "Snack PM", "Dinner": "Cena", "Supplement": "Suplemento" },
  "entry": { "new": "Nueva entrada", "photos": "Fotos", "addPhotos": "Agregar fotos", "time": "Hora", "type": "Tipo de comida", "compliance": "¿Cumple el plan?", "description": "Descripción", "symptoms": "Tuve molestias digestivas", "symptomsDesc": "Describe los síntomas", "save": "Guardar entrada", "detail": "Detalle", "noEntries": "Sin entradas todavía", "comments": "Comentarios del coach", "noComments": "Sin comentarios", "delete": "Eliminar" },
  "compliance": { "yes": "Sí", "no": "No", "na": "N/A" },
  "plan": { "title": "Mi plan", "today": "Hoy", "none": "Aún no tienes un plan asignado", "week": "Semana" },
  "coach": { "clients": "Clientes", "invite": "Invitar cliente", "inviteEmail": "Correo del cliente", "send": "Enviar invitación", "metrics": "Métricas", "totalEntries": "Entradas", "compliancePct": "% Cumplimiento", "symptomDays": "Días con síntomas", "plan": "Plan", "editPlan": "Editar plan", "addComment": "Agregar comentario", "confirm": "Confirmar cumplimiento", "addItem": "Agregar comida", "newPlan": "Nuevo plan" },
  "common": { "back": "Atrás", "loading": "Cargando…", "cancel": "Cancelar" }
}
```
`en.json` (parallel English): `auth` {login "Log in", email "Email", password "Password", error "Invalid credentials", logout "Log out"}, `nav` {timeline "Journal", add "Add", plan "My plan"}, `category` {Breakfast "Breakfast", "AM Snack" "AM Snack", Lunch "Lunch", "PM Snack" "PM Snack", Dinner "Dinner", Supplement "Supplement"}, `entry` {new "New entry", photos "Photos", addPhotos "Add photos", time "Time", type "Meal type", compliance "Follows the plan?", description "Description", symptoms "I had digestive discomfort", symptomsDesc "Describe symptoms", save "Save entry", detail "Detail", noEntries "No entries yet", comments "Coach comments", noComments "No comments", delete "Delete"}, `compliance` {yes "Yes", no "No", na "N/A"}, `plan` {title "My plan", today "Today", none "No plan assigned yet", week "Week"}, `coach` {clients "Clients", invite "Invite client", inviteEmail "Client email", send "Send invitation", metrics "Metrics", totalEntries "Entries", compliancePct "Compliance %", symptomDays "Symptom days", plan "Plan", editPlan "Edit plan", addComment "Add comment", confirm "Confirm compliance", addItem "Add meal", newPlan "New plan"}, `common` {back "Back", loading "Loading…", cancel "Cancel"}.

- [ ] **Step 4: Create `components/Spinner.jsx`**

```jsx
import { useTranslation } from "react-i18next";
export function Spinner() {
  const { t } = useTranslation();
  return <p className="p-4 font-heading uppercase tracking-wide text-sm text-ink/60">{t("common.loading")}</p>;
}
```

- [ ] **Step 5: Create `components/AuthImage.jsx`**

```jsx
import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export function AuthImage({ path, alt = "", className = "" }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let revoked = false;
    let made = null;
    api.blobUrl(path).then((u) => { if (!revoked) { made = u; setUrl(u); } }).catch(() => {});
    return () => { revoked = true; if (made) URL.revokeObjectURL(made); };
  }, [path]);
  if (!url) return <div className={`bg-muted ${className}`} aria-label={alt} />;
  return <img src={url} alt={alt} className={className} />;
}
```

- [ ] **Step 6: Create `components/AppHeader.jsx`**

```jsx
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export function AppHeader({ title, showBack = false }) {
  const navigate = useNavigate();
  return (
    <header className="bg-ink text-white">
      <div className="flex items-center gap-3 p-4">
        {showBack && (
          <button onClick={() => navigate(-1)} aria-label="back" className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <div>
          <div className="font-heading font-bold tracking-wide text-lg">BLAZE LIFESTYLE</div>
          <div className="text-white/60 text-xs tracking-wide">{title ?? "NUTRITION TRACKER"}</div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 7: Create `components/BottomNav.jsx`**

```jsx
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, Plus, CalendarDays } from "lucide-react";

const item = "flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 text-xs font-heading uppercase tracking-wide";
export function BottomNav() {
  const { t } = useTranslation();
  const cls = ({ isActive }) => `${item} ${isActive ? "text-primary" : "text-ink/60"}`;
  return (
    <nav className="border-t-2 border-border bg-white flex">
      <NavLink to="/home" className={cls}><ClipboardList className="w-5 h-5" />{t("nav.timeline")}</NavLink>
      <NavLink to="/add" className={cls}><Plus className="w-5 h-5" />{t("nav.add")}</NavLink>
      <NavLink to="/plan" className={cls}><CalendarDays className="w-5 h-5" />{t("nav.plan")}</NavLink>
    </nav>
  );
}
```

- [ ] **Step 8: Write the failing test**

`components/ComplianceBadge.test.jsx`:
```jsx
import { render, screen } from "@testing-library/react";
import { ComplianceBadge } from "./ComplianceBadge.jsx";
import "../lib/i18n.js";

it("shows a labeled compliance badge", () => {
  render(<ComplianceBadge value="yes" />);
  expect(screen.getByText(/sí/i)).toBeInTheDocument();
});
```

- [ ] **Step 9: Run to verify failure**

Run: `npm test -w @blaze/web -- ComplianceBadge`
Expected: FAIL (module missing).

- [ ] **Step 10: Create `components/ComplianceBadge.jsx`**

```jsx
import { useTranslation } from "react-i18next";
import { Check, X, Minus } from "lucide-react";

const styles = {
  yes: { cls: "bg-success text-white border-success", Icon: Check },
  no: { cls: "bg-danger text-white border-danger", Icon: X },
  na: { cls: "bg-white text-ink border-ink", Icon: Minus },
};
export function ComplianceBadge({ value = "na" }) {
  const { t } = useTranslation();
  const s = styles[value] ?? styles.na;
  const Icon = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1 border-2 px-2 py-1 text-xs font-heading uppercase tracking-wide ${s.cls}`}>
      <Icon className="w-3 h-3" />{t(`compliance.${value}`)}
    </span>
  );
}
```

- [ ] **Step 11: Run test and commit**

Run: `npm test -w @blaze/web -- ComplianceBadge`
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): api client extensions, auth guards prep, shared Blaze UI primitives"
```

---

### Task 2: Routing with role guards + Coach layout shell

**Files:**
- Modify: `apps/web/src/app/router.jsx`
- Create: `apps/web/src/features/coach/CoachLayout.jsx`
- Test: `apps/web/src/app/router.test.jsx`

**Interfaces:**
- `RequireAuth` and `RequireRole(role)` wrappers redirect to `/login` (or `/` ) when unauthorized.
- Routes: client `/home`, `/add`, `/entry/:id`, `/plan` (role client); coach `/coach` (clients), `/coach/clients/:id`, `/coach/clients/:id/plan`, `/coach/entries/:id` (role coach). Placeholders are replaced by real screens in later tasks — for THIS task they may import the screens that exist; screens not yet built render a simple `<Spinner/>` placeholder element inline.

- [ ] **Step 1: Write the failing test**

`app/router.test.jsx`:
```jsx
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { AuthProvider } from "../lib/auth.jsx";
import { routes } from "./router.jsx";
import "../lib/i18n.js";

it("redirects an unauthenticated visitor from /home to /login", () => {
  localStorage.clear();
  const r = createMemoryRouter(routes, { initialEntries: ["/home"] });
  render(<AuthProvider><RouterProvider router={r} /></AuthProvider>);
  expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/web -- router`
Expected: FAIL (no `routes` export yet).

- [ ] **Step 3: Create `features/coach/CoachLayout.jsx`**

```jsx
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth.jsx";
import { Users, LogOut } from "lucide-react";

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

- [ ] **Step 4: Rewrite `app/router.jsx`**

```jsx
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { LoginScreen } from "../features/auth/LoginScreen.jsx";
import { BottomNav } from "../components/BottomNav.jsx";
import { CoachLayout } from "../features/coach/CoachLayout.jsx";
import { TimelineScreen } from "../features/nutrition/TimelineScreen.jsx";
import { AddEntryScreen } from "../features/nutrition/AddEntryScreen.jsx";
import { EntryDetailScreen } from "../features/nutrition/EntryDetailScreen.jsx";
import { MyPlanScreen } from "../features/nutrition/MyPlanScreen.jsx";
import { ClientsScreen } from "../features/coach/ClientsScreen.jsx";
import { ClientDetailScreen } from "../features/coach/ClientDetailScreen.jsx";
import { PlanEditorScreen } from "../features/coach/PlanEditorScreen.jsx";
import { CoachEntryScreen } from "../features/coach/CoachEntryScreen.jsx";

function RequireRole({ role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "coach" ? "/coach" : "/home"} replace />;
}

// Client shell: centered mobile column + bottom nav
function ClientShell() {
  return (
    <div className="mx-auto max-w-[480px] min-h-dvh flex flex-col bg-white">
      <div className="flex-1 flex flex-col"><Outlet /></div>
      <BottomNav />
    </div>
  );
}

export const routes = [
  { path: "/login", element: <LoginScreen /> },
  { path: "/", element: <RoleHome /> },
  {
    element: <RequireRole role="client" />,
    children: [
      {
        element: <ClientShell />,
        children: [
          { path: "/home", element: <TimelineScreen /> },
          { path: "/add", element: <AddEntryScreen /> },
          { path: "/entry/:id", element: <EntryDetailScreen /> },
          { path: "/plan", element: <MyPlanScreen /> },
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
          { path: "/coach/clients/:id", element: <ClientDetailScreen /> },
          { path: "/coach/clients/:id/plan", element: <PlanEditorScreen /> },
          { path: "/coach/entries/:id", element: <CoachEntryScreen /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
```

NOTE: This task imports screen modules created in Tasks 3–9. To keep the suite green NOW, create minimal placeholder files for each not-yet-built screen that `export function <Name>() { return null; }` — later tasks REPLACE them with real implementations. Create placeholders for: TimelineScreen, AddEntryScreen, EntryDetailScreen, MyPlanScreen, ClientsScreen, ClientDetailScreen, PlanEditorScreen, CoachEntryScreen.

- [ ] **Step 5: Run test and commit**

Run: `npm test -w @blaze/web` (full web suite — App.test, LoginScreen, ComplianceBadge, router)
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): role-guarded routing + coach layout shell (screen placeholders)"
```

---

### Task 3: Client — Timeline (home)

**Files:**
- Replace: `apps/web/src/features/nutrition/TimelineScreen.jsx`
- Test: `apps/web/src/features/nutrition/TimelineScreen.test.jsx`

**Interfaces:**
- Loads `api.get("/me/entries")`; groups by `eatenAt` date; each entry is a card (first photo via `AuthImage`, category translated, time, symptom + compliance badges) linking to `/entry/:id`. Empty state when none. A floating add link to `/add`.

- [ ] **Step 1: Write the failing test**

`features/nutrition/TimelineScreen.test.jsx`:
```jsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";

vi.mock("../../lib/api.js", () => ({
  api: {
    get: vi.fn().mockResolvedValue([
      { id: "e1", category: "Breakfast", description: "Avena", eatenAt: "2026-06-15T08:00:00.000Z", hasSymptoms: false, clientCompliance: "yes", coachCompliance: null, photos: [{ thumbKey: "thumbs/a.jpg" }] },
    ]),
    blobUrl: vi.fn().mockResolvedValue("blob:x"),
  },
}));

import { TimelineScreen } from "./TimelineScreen.jsx";

it("renders entries from the API", async () => {
  render(<MemoryRouter><TimelineScreen /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/desayuno/i)).toBeInTheDocument());
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/web -- TimelineScreen`
Expected: FAIL (placeholder renders null).

- [ ] **Step 3: Implement `TimelineScreen.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Clock } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { ComplianceBadge } from "../../components/ComplianceBadge.jsx";

function dayKey(iso) { return new Date(iso).toISOString().slice(0, 10); }
function time(iso) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

export function TimelineScreen() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState(null);
  useEffect(() => { api.get("/me/entries").then(setEntries).catch(() => setEntries([])); }, []);
  if (!entries) return (<><AppHeader /><Spinner /></>);

  const days = [...new Set(entries.map((e) => dayKey(e.eatenAt)))].sort((a, b) => (a < b ? 1 : -1));
  return (
    <>
      <AppHeader />
      <div className="flex-1 overflow-y-auto bg-muted">
        {entries.length === 0 && <p className="p-8 text-center font-heading uppercase text-ink/50">{t("entry.noEntries")}</p>}
        {days.map((d) => (
          <section key={d}>
            <h2 className="sticky top-0 bg-ink/90 text-white px-4 py-2 font-heading uppercase tracking-wide text-sm">{d}</h2>
            <div className="p-3 space-y-3">
              {entries.filter((e) => dayKey(e.eatenAt) === d).map((e) => (
                <Link key={e.id} to={`/entry/${e.id}`} className="flex gap-3 bg-white border-2 border-border p-3 hover:border-primary">
                  {e.photos?.[0] && <AuthImage path={`/photos/${e.photos[0].thumbKey}`} className="w-16 h-16 object-cover border-2 border-border" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading uppercase tracking-wide font-bold">{t(`category.${e.category}`)}</span>
                      {e.hasSymptoms && <AlertCircle className="w-4 h-4 text-danger" />}
                    </div>
                    {e.description && <p className="text-sm text-ink/70">{e.description}</p>}
                    <div className="flex items-center justify-between mt-1">
                      <span className="flex items-center gap-1 text-xs text-ink/50"><Clock className="w-3 h-3" />{time(e.eatenAt)}</span>
                      <ComplianceBadge value={e.coachCompliance ?? e.clientCompliance} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run test and commit**

Run: `npm test -w @blaze/web -- TimelineScreen`
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): client nutrition timeline screen"
```

---

### Task 4: Client — New entry (photos + fields)

**Files:**
- Replace: `apps/web/src/features/nutrition/AddEntryScreen.jsx`
- Test: `apps/web/src/features/nutrition/AddEntryScreen.test.jsx`

**Interfaces:**
- Form with: photo input (`accept="image/*" capture multiple`), category select, time, compliance select, symptoms checkbox + description, description. On submit builds `FormData` (fields + `photos` files) and `api.postForm("/me/entries", form)`, then navigates to `/home`. Save disabled until ≥1 photo + category.

- [ ] **Step 1: Write the failing test**

`features/nutrition/AddEntryScreen.test.jsx`:
```jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({ api: { postForm: vi.fn().mockResolvedValue({ id: "x" }) } }));
import { AddEntryScreen } from "./AddEntryScreen.jsx";

it("renders the new-entry form with a disabled save until valid", () => {
  render(<MemoryRouter><AddEntryScreen /></MemoryRouter>);
  expect(screen.getByText(/nueva entrada/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /guardar entrada/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/web -- AddEntryScreen`
Expected: FAIL.

- [ ] **Step 3: Implement `AddEntryScreen.jsx`**

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, X } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Button } from "../../components/Button.jsx";

const CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];
const field = "w-full p-3 border-2 border-border rounded-none bg-white";
const label = "font-heading uppercase tracking-wide text-sm";

export function AddEntryScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState("");
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [compliance, setCompliance] = useState("na");
  const [description, setDescription] = useState("");
  const [hasSymptoms, setHasSymptoms] = useState(false);
  const [symptomDescription, setSymptomDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));
  const valid = files.length > 0 && category;

  async function onSave() {
    setSaving(true);
    const form = new FormData();
    form.append("category", category);
    form.append("eatenAt", new Date(`${new Date().toISOString().slice(0, 10)}T${time}:00`).toISOString());
    form.append("clientCompliance", compliance);
    if (description) form.append("description", description);
    form.append("hasSymptoms", String(hasSymptoms));
    if (hasSymptoms && symptomDescription) form.append("symptomDescription", symptomDescription);
    files.forEach((f) => form.append("photos", f));
    try { await api.postForm("/me/entries", form); navigate("/home"); }
    finally { setSaving(false); }
  }

  return (
    <>
      <AppHeader title={t("entry.new").toUpperCase()} showBack />
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-2">
          <span className={label}>{t("entry.photos")}</span>
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
            <span className="font-heading uppercase text-sm">{t("entry.addPhotos")}</span>
            <input type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />
          </label>
        </div>
        <label className="block space-y-1"><span className={label}>{t("entry.time")}</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} /></label>
        <label className="block space-y-1"><span className={label}>{t("entry.type")}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            <option value="" disabled>—</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
          </select></label>
        <label className="block space-y-1"><span className={label}>{t("entry.compliance")}</span>
          <select value={compliance} onChange={(e) => setCompliance(e.target.value)} className={field}>
            <option value="na">{t("compliance.na")}</option>
            <option value="yes">{t("compliance.yes")}</option>
            <option value="no">{t("compliance.no")}</option>
          </select></label>
        <label className="block space-y-1"><span className={label}>{t("entry.description")}</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={field} /></label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hasSymptoms} onChange={(e) => setHasSymptoms(e.target.checked)} className="w-5 h-5" />
          <span className="font-medium">{t("entry.symptoms")}</span></label>
        {hasSymptoms && <textarea value={symptomDescription} onChange={(e) => setSymptomDescription(e.target.value)} rows={2} placeholder={t("entry.symptomsDesc")} className={`${field} border-danger`} />}
      </div>
      <div className="p-4 border-t-2 border-border">
        <Button variant="primary" className="w-full" disabled={!valid || saving} onClick={onSave}>{t("entry.save")}</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run test and commit**

Run: `npm test -w @blaze/web -- AddEntryScreen`
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): client new-entry screen with photo capture"
```

---

### Task 5: Client — Entry detail + My plan

**Files:**
- Replace: `apps/web/src/features/nutrition/EntryDetailScreen.jsx`, `apps/web/src/features/nutrition/MyPlanScreen.jsx`
- Test: `apps/web/src/features/nutrition/EntryDetailScreen.test.jsx`

**Interfaces:**
- `EntryDetailScreen`: `api.get("/me/entries/:id")` → gallery (AuthImage), category, time, digestive status, compliance badges (own + coach), coach comments list; delete button calls `api.del` then navigates home.
- `MyPlanScreen`: `api.get("/me/plan")` and `api.get("/me/plan/today", { date })` → today's assigned meals highlighted + the full weekly grid; empty state when no plan.

- [ ] **Step 1: Write the failing test**

`features/nutrition/EntryDetailScreen.test.jsx`:
```jsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ id: "e1", category: "Lunch", eatenAt: "2026-06-15T13:00:00.000Z", hasSymptoms: false, clientCompliance: "yes", coachCompliance: null, photos: [], comments: [{ id: "c1", body: "Bien hecho", createdAt: "2026-06-15T14:00:00.000Z" }] }),
    blobUrl: vi.fn().mockResolvedValue("blob:x"), del: vi.fn(),
  },
}));
import { EntryDetailScreen } from "./EntryDetailScreen.jsx";

it("shows the entry and coach comment", async () => {
  render(<MemoryRouter initialEntries={["/entry/e1"]}><Routes><Route path="/entry/:id" element={<EntryDetailScreen />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/almuerzo/i)).toBeInTheDocument());
  expect(screen.getByText(/bien hecho/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/web -- EntryDetailScreen`
Expected: FAIL.

- [ ] **Step 3: Implement `EntryDetailScreen.jsx`**

```jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, Trash2 } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { ComplianceBadge } from "../../components/ComplianceBadge.jsx";
import { Button } from "../../components/Button.jsx";

export function EntryDetailScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  useEffect(() => { api.get(`/me/entries/${id}`).then(setEntry).catch(() => {}); }, [id]);
  if (!entry) return (<><AppHeader title={t("entry.detail").toUpperCase()} showBack /><Spinner /></>);

  async function onDelete() { await api.del(`/me/entries/${id}`); navigate("/home"); }

  return (
    <>
      <AppHeader title={t("entry.detail").toUpperCase()} showBack />
      <div className="flex-1 overflow-y-auto">
        {entry.photos?.length > 0 && (
          <div className="grid grid-cols-2 gap-1">
            {entry.photos.map((p, i) => <AuthImage key={i} path={`/photos/${p.storageKey}`} className="w-full h-40 object-cover" />)}
          </div>
        )}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading uppercase tracking-wide text-xl font-bold">{t(`category.${entry.category}`)}</h2>
            <ComplianceBadge value={entry.coachCompliance ?? entry.clientCompliance} />
          </div>
          <div className={`flex items-center gap-2 font-heading uppercase text-sm ${entry.hasSymptoms ? "text-danger" : "text-ink/60"}`}>
            {entry.hasSymptoms ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            {entry.hasSymptoms ? entry.symptomDescription || t("entry.symptoms") : "OK"}
          </div>
          <div>
            <h3 className="font-heading uppercase tracking-wide text-sm mb-2">{t("entry.comments")}</h3>
            {(!entry.comments || entry.comments.length === 0) && <p className="text-ink/50 text-sm">{t("entry.noComments")}</p>}
            <div className="space-y-2">
              {entry.comments?.map((c) => <div key={c.id} className="border-2 border-border p-3 bg-muted text-sm">{c.body}</div>)}
            </div>
          </div>
          <Button variant="secondary" className="w-full flex items-center justify-center gap-2" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />{t("entry.delete")}
          </Button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Implement `MyPlanScreen.jsx`**

```jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];

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
              <div key={r.itemId} className="border-2 border-primary p-3">
                <div className="font-heading uppercase text-xs text-ink/60">{t(`category.${r.category}`)}</div>
                <div className="font-medium">{r.title}</div>
                {r.notes && <div className="text-sm text-ink/60">{r.notes}</div>}
              </div>
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

- [ ] **Step 5: Run test and commit**

Run: `npm test -w @blaze/web -- EntryDetailScreen`
Expected: PASS. Also run `npm test -w @blaze/web` to confirm the full suite.

```bash
git add -A
git commit -m "feat(web): client entry detail + my plan screens"
```

---

### Task 6: Coach — Clients list + invite

**Files:**
- Replace: `apps/web/src/features/coach/ClientsScreen.jsx`
- Test: `apps/web/src/features/coach/ClientsScreen.test.jsx`

**Interfaces:**
- `api.get("/coach/clients")` → list (name, email, entry count) each linking to `/coach/clients/:id`. An invite form posts `api.post("/coach/invitations", { email })` and shows the resulting accept link (`/login`-relative token) for manual sharing.

- [ ] **Step 1: Write the failing test**

`features/coach/ClientsScreen.test.jsx`:
```jsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({
  api: { get: vi.fn().mockResolvedValue([{ id: "u1", name: "Ana", email: "ana@x.com", totalEntries: 3 }]), post: vi.fn() },
}));
import { ClientsScreen } from "./ClientsScreen.jsx";

it("lists clients from the API", async () => {
  render(<MemoryRouter><ClientsScreen /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText("Ana")).toBeInTheDocument());
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/web -- ClientsScreen`
Expected: FAIL.

- [ ] **Step 3: Implement `ClientsScreen.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";

export function ClientsScreen() {
  const { t } = useTranslation();
  const [clients, setClients] = useState(null);
  const [email, setEmail] = useState("");
  const [inviteToken, setInviteToken] = useState(null);
  useEffect(() => { api.get("/coach/clients").then(setClients).catch(() => setClients([])); }, []);

  async function invite(e) {
    e.preventDefault();
    const res = await api.post("/coach/invitations", { email });
    setInviteToken(res.token);
    setEmail("");
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{t("coach.clients")}</h1>
      <form onSubmit={invite} className="flex flex-wrap gap-2 items-end">
        <label className="flex-1 min-w-[200px] space-y-1">
          <span className="font-heading uppercase text-sm">{t("coach.inviteEmail")}</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border-2 border-ink rounded-none" />
        </label>
        <Button type="submit" variant="primary">{t("coach.send")}</Button>
      </form>
      {inviteToken && (
        <p className="border-2 border-success p-3 text-sm break-all">
          {`${window.location.origin}/login?invite=${inviteToken}`}
        </p>
      )}
      {!clients ? <Spinner /> : (
        <div className="space-y-2">
          {clients.map((c) => (
            <Link key={c.id} to={`/coach/clients/${c.id}`} className="flex justify-between items-center border-2 border-border p-4 hover:border-primary">
              <div><div className="font-heading uppercase tracking-wide font-bold">{c.name}</div><div className="text-sm text-ink/60">{c.email}</div></div>
              <span className="font-heading text-primary">{c.totalEntries} {t("coach.totalEntries")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test and commit**

Run: `npm test -w @blaze/web -- ClientsScreen`
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): coach clients list + invite"
```

---

### Task 7: Coach — Client detail (metrics + timeline)

**Files:**
- Replace: `apps/web/src/features/coach/ClientDetailScreen.jsx`
- Test: `apps/web/src/features/coach/ClientDetailScreen.test.jsx`

**Interfaces:**
- `api.get("/coach/clients/:id")` (metrics) + `api.get("/coach/clients/:id/entries")` (timeline). Shows metric tiles (entries, compliance %, symptom days), a link to the plan editor (`/coach/clients/:id/plan`), and the entries list linking to `/coach/entries/:entryId`.

- [ ] **Step 1: Write the failing test**

`features/coach/ClientDetailScreen.test.jsx`:
```jsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({
  api: {
    get: vi.fn((p) => p.endsWith("/entries")
      ? Promise.resolve([{ id: "e1", category: "Breakfast", eatenAt: "2026-06-15T08:00:00.000Z", hasSymptoms: false, clientCompliance: "yes", coachCompliance: null, photos: [] }])
      : Promise.resolve({ id: "u1", name: "Ana", email: "ana@x.com", metrics: { totalEntries: 1, compliancePct: null, symptomDays: 0 } })),
    blobUrl: vi.fn().mockResolvedValue("blob:x"),
  },
}));
import { ClientDetailScreen } from "./ClientDetailScreen.jsx";

it("shows client name and metrics", async () => {
  render(<MemoryRouter initialEntries={["/coach/clients/u1"]}><Routes><Route path="/coach/clients/:id" element={<ClientDetailScreen />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByText("Ana")).toBeInTheDocument());
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/web -- ClientDetailScreen`
Expected: FAIL.

- [ ] **Step 3: Implement `ClientDetailScreen.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { api } from "../../lib/api.js";
import { Spinner } from "../../components/Spinner.jsx";
import { ComplianceBadge } from "../../components/ComplianceBadge.jsx";

function Tile({ label, value }) {
  return <div className="border-2 border-border p-3 text-center"><div className="text-2xl font-heading">{value ?? "—"}</div><div className="text-xs font-heading uppercase text-ink/60">{label}</div></div>;
}

export function ClientDetailScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [client, setClient] = useState(null);
  const [entries, setEntries] = useState(null);
  useEffect(() => {
    api.get(`/coach/clients/${id}`).then(setClient).catch(() => {});
    api.get(`/coach/clients/${id}/entries`).then(setEntries).catch(() => setEntries([]));
  }, [id]);
  if (!client) return <Spinner />;

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="font-heading uppercase tracking-wide text-2xl">{client.name}</h1><p className="text-ink/60">{client.email}</p></div>
        <Link to={`/coach/clients/${id}/plan`} className="flex items-center gap-2 border-2 border-primary text-primary px-4 min-h-[44px] font-heading uppercase tracking-wide">
          <CalendarDays className="w-4 h-4" />{t("coach.editPlan")}
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Tile label={t("coach.totalEntries")} value={client.metrics.totalEntries} />
        <Tile label={t("coach.compliancePct")} value={client.metrics.compliancePct != null ? `${client.metrics.compliancePct}%` : null} />
        <Tile label={t("coach.symptomDays")} value={client.metrics.symptomDays} />
      </div>
      {!entries ? <Spinner /> : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Link key={e.id} to={`/coach/entries/${e.id}`} className="flex justify-between items-center border-2 border-border p-3 hover:border-primary">
              <span className="font-heading uppercase tracking-wide">{t(`category.${e.category}`)} · {new Date(e.eatenAt).toISOString().slice(0, 10)}</span>
              <ComplianceBadge value={e.coachCompliance ?? e.clientCompliance} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test and commit**

Run: `npm test -w @blaze/web -- ClientDetailScreen`
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): coach client detail with metrics + timeline"
```

---

### Task 8: Coach — Plan editor

**Files:**
- Replace: `apps/web/src/features/coach/PlanEditorScreen.jsx`
- Test: `apps/web/src/features/coach/PlanEditorScreen.test.jsx`

**Interfaces:**
- `api.get("/coach/clients/:id/plan")`. If no active plan, a "create plan" form (`api.post("/coach/clients/:id/plan", { name, startDate })`). With a plan: list items + an add-item form (`api.post("/coach/plans/:planId/items", { category, title, dayOfWeek })`) and delete (`api.del("/coach/plan-items/:itemId")`). Reloads after each mutation.

- [ ] **Step 1: Write the failing test**

`features/coach/PlanEditorScreen.test.jsx`:
```jsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({
  api: { get: vi.fn().mockResolvedValue({ plan: { id: "p1", name: "Plan Jun" }, items: [{ id: "i1", category: "Breakfast", title: "Avena", dayOfWeek: 1 }] }), post: vi.fn(), del: vi.fn() },
}));
import { PlanEditorScreen } from "./PlanEditorScreen.jsx";

it("shows existing plan items", async () => {
  render(<MemoryRouter initialEntries={["/coach/clients/u1/plan"]}><Routes><Route path="/coach/clients/:id/plan" element={<PlanEditorScreen />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByText("Avena")).toBeInTheDocument());
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/web -- PlanEditorScreen`
Expected: FAIL.

- [ ] **Step 3: Implement `PlanEditorScreen.jsx`**

```jsx
import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { api } from "../../lib/api.js";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];
const field = "w-full p-2 border-2 border-border rounded-none";

export function PlanEditorScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [item, setItem] = useState({ category: "Breakfast", title: "", dayOfWeek: 1 });

  const load = useCallback(() => { api.get(`/coach/clients/${id}/plan`).then((d) => setData(d ?? { plan: null, items: [] })).catch(() => setData({ plan: null, items: [] })); }, [id]);
  useEffect(() => { load(); }, [load]);
  if (!data) return <Spinner />;

  async function createPlan(e) { e.preventDefault(); await api.post(`/coach/clients/${id}/plan`, { name, startDate }); load(); }
  async function addItem(e) { e.preventDefault(); await api.post(`/coach/plans/${data.plan.id}/items`, { category: item.category, title: item.title, dayOfWeek: Number(item.dayOfWeek) }); setItem({ ...item, title: "" }); load(); }
  async function delItem(itemId) { await api.del(`/coach/plan-items/${itemId}`); load(); }

  if (!data.plan) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="font-heading uppercase tracking-wide text-2xl">{t("coach.newPlan")}</h1>
        <form onSubmit={createPlan} className="space-y-3 max-w-md">
          <input className={field} placeholder="Plan" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="date" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <Button type="submit" variant="primary">{t("coach.newPlan")}</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{data.plan.name}</h1>
      <div className="space-y-2">
        {data.items.filter((i) => i.dayOfWeek != null).sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((i) => (
          <div key={i.id} className="flex justify-between items-center border-2 border-border p-3">
            <span><span className="font-heading uppercase text-xs text-ink/60">{DAYS[i.dayOfWeek]} · {t(`category.${i.category}`)}</span> — {i.title}</span>
            <button onClick={() => delItem(i.id)} aria-label="delete" className="text-danger min-h-[44px] min-w-[44px] flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <form onSubmit={addItem} className="flex flex-wrap gap-2 items-end border-t-2 border-border pt-4">
        <select className={field + " flex-1 min-w-[120px]"} value={item.dayOfWeek} onChange={(e) => setItem({ ...item, dayOfWeek: e.target.value })}>
          {DAYS.map((d, n) => <option key={n} value={n}>{d}</option>)}
        </select>
        <select className={field + " flex-1 min-w-[120px]"} value={item.category} onChange={(e) => setItem({ ...item, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
        </select>
        <input className={field + " flex-1 min-w-[160px]"} placeholder={t("coach.addItem")} value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} required />
        <Button type="submit" variant="primary">{t("coach.addItem")}</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run test and commit**

Run: `npm test -w @blaze/web -- PlanEditorScreen`
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): coach plan editor (create plan, weekly items)"
```

---

### Task 9: Coach — Entry review (comment + confirm compliance)

**Files:**
- Replace: `apps/web/src/features/coach/CoachEntryScreen.jsx`
- Test: `apps/web/src/features/coach/CoachEntryScreen.test.jsx`

**Interfaces:**
- The coach reaches this via `/coach/entries/:id`. Since the API's coach entry endpoint is `/coach/clients/:clientId/entries/:entryId`, this screen instead loads the entry through the clientId carried in router state OR refetches via the client list; to keep it simple, the entry list links pass the entry id and we read the entry with `api.get("/coach/clients/" + clientId + "/entries/" + id)` using `clientId` from `useSearchParams`. **Implementation:** `ClientDetailScreen` already links to `/coach/entries/:id` — change those links to `/coach/entries/:id?client=:clientId`. This screen reads `client` from `useSearchParams`, fetches the entry, shows photos + fields, an add-comment form (`api.post("/coach/entries/:id/comments", { body })`), and compliance buttons (`api.patch("/coach/entries/:id/compliance", { coachCompliance })`).

- [ ] **Step 1: Write the failing test**

`features/coach/CoachEntryScreen.test.jsx`:
```jsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import "../../lib/i18n.js";
vi.mock("../../lib/api.js", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ id: "e1", category: "Breakfast", eatenAt: "2026-06-15T08:00:00.000Z", hasSymptoms: false, clientCompliance: "no", coachCompliance: null, photos: [], comments: [] }),
    blobUrl: vi.fn().mockResolvedValue("blob:x"), post: vi.fn(), patch: vi.fn(),
  },
}));
import { CoachEntryScreen } from "./CoachEntryScreen.jsx";

it("renders entry review with a comment box", async () => {
  render(<MemoryRouter initialEntries={["/coach/entries/e1?client=u1"]}><Routes><Route path="/coach/entries/:id" element={<CoachEntryScreen />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/desayuno/i)).toBeInTheDocument());
  expect(screen.getByRole("button", { name: /agregar comentario/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @blaze/web -- CoachEntryScreen`
Expected: FAIL.

- [ ] **Step 3: Update `ClientDetailScreen.jsx` entry links** to include the client query param: change `to={\`/coach/entries/${e.id}\`}` to `to={\`/coach/entries/${e.id}?client=${id}\`}`.

- [ ] **Step 4: Implement `CoachEntryScreen.jsx`**

```jsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { Spinner } from "../../components/Spinner.jsx";
import { AuthImage } from "../../components/AuthImage.jsx";
import { ComplianceBadge } from "../../components/ComplianceBadge.jsx";
import { Button } from "../../components/Button.jsx";

export function CoachEntryScreen() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const clientId = params.get("client");
  const { t } = useTranslation();
  const [entry, setEntry] = useState(null);
  const [comment, setComment] = useState("");

  const load = useCallback(() => { api.get(`/coach/clients/${clientId}/entries/${id}`).then(setEntry).catch(() => {}); }, [clientId, id]);
  useEffect(() => { load(); }, [load]);
  if (!entry) return <Spinner />;

  async function addComment(e) { e.preventDefault(); await api.post(`/coach/entries/${id}/comments`, { body: comment }); setComment(""); load(); }
  async function setCompliance(value) { await api.patch(`/coach/entries/${id}/compliance`, { coachCompliance: value }); load(); }

  return (
    <div className="p-4 space-y-5 max-w-2xl">
      {entry.photos?.length > 0 && (
        <div className="grid grid-cols-2 gap-1">{entry.photos.map((p, i) => <AuthImage key={i} path={`/photos/${p.storageKey}`} className="w-full h-48 object-cover" />)}</div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="font-heading uppercase tracking-wide text-2xl">{t(`category.${entry.category}`)}</h1>
        <ComplianceBadge value={entry.coachCompliance ?? entry.clientCompliance} />
      </div>
      {entry.description && <p className="text-ink/70">{entry.description}</p>}
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => setCompliance("yes")}>{t("compliance.yes")}</Button>
        <Button variant="secondary" onClick={() => setCompliance("no")}>{t("compliance.no")}</Button>
      </div>
      <div className="space-y-2">
        <h3 className="font-heading uppercase tracking-wide text-sm">{t("entry.comments")}</h3>
        {entry.comments?.map((c) => <div key={c.id} className="border-2 border-border p-3 bg-muted text-sm">{c.body}</div>)}
        <form onSubmit={addComment} className="flex gap-2">
          <input className="flex-1 p-3 border-2 border-border rounded-none" value={comment} onChange={(e) => setComment(e.target.value)} required />
          <Button type="submit" variant="primary">{t("coach.addComment")}</Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test and commit**

Run: `npm test -w @blaze/web -- CoachEntryScreen` then `npm test -w @blaze/web` (full suite).
Expected: PASS.

```bash
git add -A
git commit -m "feat(web): coach entry review — comments + compliance confirmation"
```

---

## Self-Review

- Client: timeline (T3), new entry w/ photos (T4), detail + comments (T5), my plan (T5). ✓
- Coach/admin: clients + invite (T6), client detail + metrics (T7), plan editor (T8), entry review w/ comments + compliance (T9). ✓
- Role-guarded routing + coach master-detail layout (T2); shared primitives + authed image loading + i18n (T1). ✓
- Logout footgun fixed (T1). RequireRole guards added (T2). ✓
- Photos load via authenticated proxy (AuthImage), never token-in-URL. ✓
- All strings via i18n; Blaze tokens only; Lucide icons. ✓
- After all tasks: run the full web suite + a manual end-to-end smoke (coach assigns plan, client logs a meal with a photo, coach comments + confirms compliance) before declaring done.
