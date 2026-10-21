# EduConnect Sindh — Build Guide & Progress Tracker

> Living document. Every step we finish gets ticked ✅ and explained here.
> Source: FYP proposal (University of Sindh, Jamshoro, 2026).

---

## 1. Tech Stack (what, why, and what's new to learn)

| Layer | Tool | Why | New? |
|---|---|---|---|
| Runtime / language | Node.js + **TypeScript** (strict) | Type safety catches bugs before running | Learn basics |
| Web framework | **Express 5** | Simple, popular, you chose it | — |
| Database | **PostgreSQL** | Relational data (users, tutors, requests, reviews) | — |
| ORM | **Prisma** | Type-safe DB access + migrations + schema file | **New** |
| Validation | **Zod** | Validate request bodies; types come for free | **New** |
| Auth | JWT (access + refresh), **argon2** hashing, RBAC | Proposal requirement | Learn |
| Cache / queue store | **Redis** | Caching, rate-limit, refresh tokens, job queue backend | **New** |
| Background jobs | **BullMQ** (on Redis) | Emails, notifications, AI calls off the request path | **New** |
| Real-time | **Socket.IO** | Live notifications / class updates | **New** |
| Logging | **Pino** | Fast structured JSON logs | **New** |
| Security | helmet, cors, express-rate-limit | Standard hardening | — |
| API docs | **Swagger / OpenAPI** | Professional, testable API docs | **New** |
| Testing | **Vitest + Supertest** | Fast unit + API tests | **New** |
| Code quality | ESLint, Prettier, **Husky + lint-staged**, Conventional Commits | Consistent, clean repo | **New** |
| DevOps | **Docker Compose** (Postgres + Redis), GitHub Actions CI | One-command setup, auto checks | **New** |
| File storage | Local `uploads/` now → S3/Cloudinary later | CNIC/verification docs (private!) | — |

> **Note:** The proposal text says "NestJS", but you chose Express. Express is fine —
> we get the same professionalism by enforcing a strict layered structure (below).
> Tell your supervisor "Express with a modular layered architecture".

---

## 2. Backend Architecture — the one idea to understand

**Feature modules + layers.** Each feature (auth, tutors, …) is a self-contained folder.
Inside it, a request always flows the same way:

```
HTTP request
   │
   ▼
 routes        → maps URL + method to a controller, attaches middlewares
   │
   ▼
 middlewares   → auth check, role check, zod validation, rate limit
   │
   ▼
 controller    → thin: reads req, calls service, sends res. NO business logic
   │
   ▼
 service       → business rules ("only verified tutors appear in search")
   │
   ▼
 repository    → ONLY place that talks to the DB (Prisma) / Redis
   │
   ▼
 PostgreSQL / Redis
```

Why: each layer has one job → easy to test, easy to change, easy to explain in your viva.

Errors: services `throw new AppError(...)`; one global error middleware turns them into
consistent JSON responses. Controllers never write `try/catch` by hand (we wrap async handlers).

### Folder structure

```
backend/
├─ src/
│  ├─ app.ts                  # builds the Express app (middlewares, routes) — no listen()
│  ├─ server.ts               # starts HTTP + Socket.IO, connects DB/Redis, graceful shutdown
│  ├─ config/                 # env validation (zod), logger, db client, redis client
│  ├─ middlewares/            # auth, role guard, validate, error handler, rate limiter, upload
│  ├─ modules/                # ★ the features (one folder each)
│  │  ├─ auth/                #   register, login, refresh, logout, password reset
│  │  ├─ users/               #   base user account & roles (student/parent, tutor, admin)
│  │  ├─ tutors/              #   tutor profile, subjects, areas, availability, fees
│  │  ├─ verification/        #   document submission + admin review + verified badge
│  │  ├─ search/              #   tutor search & filters (cached in Redis)
│  │  ├─ requests/            #   tutoring requests, shortlist, matching/recommendations
│  │  ├─ reviews/             #   ratings + moderation
│  │  ├─ courses/             #   courses, lessons, enrollment, progress
│  │  ├─ classes/             #   scheduled virtual classes
│  │  ├─ ai/                  #   AI learning assistant (calls integrations/ai)
│  │  ├─ notifications/       #   in-app + real-time notifications
│  │  ├─ admin/               #   dashboard stats, reports, moderation
│  │  └─ locations/           #   cities (Jamshoro → Hyderabad), areas; no exact addresses
│  ├─ shared/                 # errors/ (AppError), utils/, constants/ (roles…), types/
│  ├─ integrations/           # wrappers for 3rd parties: ai/, maps/, mail/, storage/
│  ├─ jobs/                   # queues/ (producers) and workers/ (BullMQ consumers)
│  ├─ sockets/                # Socket.IO setup & event handlers
│  └─ database/
│     ├─ prisma/              # (schema.prisma + migrations/ live here)
│     └─ seeds/               # demo data: admin user, subjects, Jamshoro areas
├─ tests/                     # unit/, integration/ (API), e2e/, helpers/
├─ docs/                      # architecture notes, ERD, API docs
├─ scripts/                   # one-off dev scripts
└─ uploads/.private/          # verification docs — NEVER served publicly
```

Each module will contain (created as we build it):

```
modules/tutors/
├─ tutors.routes.ts       # URLs
├─ tutors.controller.ts   # req/res only
├─ tutors.service.ts      # business logic
├─ tutors.repository.ts   # DB queries
├─ tutors.schema.ts       # zod validation (+ inferred TS types)
└─ tutors.test.ts         # tests
```

**Rule of thumb:** modules may import from `shared/`, `config/`, `integrations/`.
A module should call another module only through its **service**, never its repository.

---

## 3. Workflow we follow for every feature

1. **Design** — what table(s), what endpoints? (write it down)
2. **Schema** — Prisma model + migration
3. **Zod schema** — validate input
4. **Repository → Service → Controller → Routes**
5. **Test** it (Vitest/Supertest) and try it in Postman/Swagger
6. **Commit** with a Conventional Commit message (`feat(auth): add login endpoint`)
7. **Tick it here** in the progress tracker

Git branching: `main` (stable) ← `develop` ← `feat/<module>` branches, merged by PR.

---

## 4. Roadmap & Progress Tracker

Legend: ✅ done · 🔄 in progress · ⬜ todo

### Phase 0 — Foundation
- ✅ 0.1 Read proposal, choose stack, design architecture
- ✅ 0.2 Create backend folder structure (empty, with `.gitkeep`)
- ✅ 0.3 `git init`, `.gitignore`, `.editorconfig`, root README
- ✅ 0.4 `npm init`, install TypeScript, `tsconfig.json` (strict), `tsx` for dev
- ✅ 0.5 ESLint + Prettier + Husky + lint-staged
- ✅ 0.6 `docker-compose.yml` (Postgres + Redis) and `.env.example`
- ✅ 0.7 Env validation with Zod (`config/env.ts`)
- ✅ 0.8 Pino logger, `app.ts` / `server.ts`, `/health` endpoint
- ✅ 0.9 Global error handler + `AppError` + 404 handler (no async wrapper needed in Express 5)
- ✅ 0.10 Security middlewares (helmet, cors, rate-limit)
- ✅ 0.11 Prisma setup + first migration + seed script
- ⬜ 0.12 Vitest + Supertest, first test (`/health`)
- ⬜ 0.13 Swagger docs at `/api/docs`
- ⬜ 0.14 GitHub Actions CI (lint + test + build)

### Phase 1 — Core modules (matches proposal weeks)
- ⬜ 1.1 Auth & roles (register, login, JWT access/refresh, RBAC)
- ⬜ 1.2 Users
- ⬜ 1.3 Tutor profile (+ locations/areas)
- ⬜ 1.4 Verification (upload docs, admin approve/reject)
- ⬜ 1.5 Search & filters (+ Redis cache)
- ⬜ 1.6 Requests, shortlist, matching/recommendations
- ⬜ 1.7 Reviews & ratings (+ moderation)
- ⬜ 1.8 Notifications (BullMQ + Socket.IO)

### Phase 2 — Learning platform
- ⬜ 2.1 Courses, lessons, enrollment, progress
- ⬜ 2.2 Virtual class scheduling
- ⬜ 2.3 AI learning assistant
- ⬜ 2.4 Admin dashboard APIs

### Phase 3 — Polish
- ⬜ 3.1 Deployment (Docker, cloud demo)
- ⬜ 3.2 Final docs, ERD, viva notes

### Changelog
| Date | Step | Notes |
|---|---|---|
| 2026-10-18 | 0.1, 0.2 | Stack chosen; `backend/` folder structure created |
| 2026-10-18 | 0.3, 0.4 | Git repo at project root; TypeScript + tsx; scripts `dev`, `build`, `start`, `typecheck` verified |
| 2026-10-18 | 0.5 | ESLint 10, Prettier, Husky, lint-staged; TypeScript pinned to 6.0; first commit |
| 2026-10-21 | 0.6 | Docker Compose: Postgres 16 (host port 5433) + Redis 7; `.env.example`; npm `docker:*` scripts |
| 2026-10-21 | 0.7 | Zod env validation in `src/config/env.ts` (+ dotenv); fails fast on bad config |
| 2026-10-21 | 0.8 | Express 5 app, Pino logging, `/health`, graceful shutdown; server runs on port 5000 |
| 2026-10-21 | 0.9 | `AppError`, global error handler, 404 handler; consistent JSON error shape |
| 2026-10-21 | 0.10 | helmet, CORS (only `CLIENT_URL`), compression, rate limiters (`apiLimiter`, `authLimiter`) |
| 2026-10-21 | 0.11 | Prisma 7.10 + PostgreSQL: `init` migration (users, refresh_tokens, cities, areas, subjects), seed, `/health` checks DB |

### Notes: steps 0.3 and 0.4 explained

- **Git repo at the project root** (not inside `backend/`), so `backend/` and `frontend/` share one history.
- **`.gitignore`** keeps `node_modules`, `dist`, `.env` (secrets!) and uploaded verification documents out of git. `.env.example` is allowed, because it holds only placeholders.
- **`.editorconfig`** makes every editor use the same indentation and line endings.
- **TypeScript** compiles `.ts` to JavaScript. We use `strict: true` plus `noUncheckedIndexedAccess` (array/object lookups may be `undefined`), which catches many bugs early.
- **tsx** runs TypeScript directly during development, with auto-restart (`npm run dev`).
- **Two tsconfigs:** `tsconfig.json` (editor, type-check, includes tests) and `tsconfig.build.json` (production build, only `src/` → `dist/`).
- **Scripts:** `dev` (watch mode), `typecheck` (no output, just checks), `build` (compile to `dist/`), `start` (run the compiled build).
- **TypeScript 7 gotcha:** `baseUrl` and `moduleResolution: node10` were removed, so we use `module: nodenext` and plain relative imports (no `@/` aliases).
- `src/server.ts` is a temporary placeholder; step 0.8 replaces it with the real server.

### Notes: step 0.5 explained (code quality automation)

| Tool | Job | Config file |
|---|---|---|
| **Prettier** | Formats code (quotes, spacing, line width). Zero debates about style. | `.prettierrc.json` |
| **ESLint** | Finds bugs and bad patterns (unused vars, `==`, forgotten imports…). | `eslint.config.mjs` |
| **lint-staged** | Runs ESLint + Prettier only on files you staged. Fast. | `lint-staged` in `package.json` |
| **Husky** | Git hook: runs lint-staged automatically on every `git commit`. | `.husky/pre-commit` |

- Husky lives at the **repo root** (`.husky/`) because that's where `.git` is; the hook does `cd backend && npx lint-staged`.
- `npm run prepare` runs automatically after `npm install` and re-installs the hook for anyone who clones the repo.
- Commands: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`.
- ESLint rules we added: no unused variables, `import type` for type-only imports, `===` only, warn on `console.log` (we'll use the Pino logger instead).
- `.gitattributes` forces LF line endings so Windows/Linux/CI agree.
- **Version gotcha:** `typescript-eslint` doesn't support TypeScript 7 yet (needs `<6.1`), so we pinned **TypeScript 6.0**. Upgrade later when support lands.
- We verified the hook: a badly formatted file was auto-fixed during `git commit`.

### Notes: step 0.6 explained (Docker, Postgres, Redis, env files)

- **Docker** runs software in isolated containers. Instead of installing PostgreSQL and Redis on Windows, one command starts them, and your teammates get the identical setup.
- **`docker-compose.yml`** describes the services:
  - `postgres:16-alpine`: the database. Data is stored in the named volume `postgres_data`, so it survives restarts.
  - `redis:7-alpine`: cache and job-queue store, with `--appendonly yes` so data is saved to disk.
  - `healthcheck`: Docker checks every few seconds that each service is really ready.
  - `ports: "5433:5432"`: host port **5433** maps to Postgres's internal 5432. We use 5433 because a local Postgres already occupies 5432 on this machine.
- **`.env` vs `.env.example`:**
  - `.env` holds real secrets and is **git-ignored**.
  - `.env.example` is committed with placeholders, so others know which variables exist. Copy it: `copy .env.example .env`.
  - Docker Compose reads `.env` automatically for the `${...}` values.
  - Change `POSTGRES_PASSWORD` and the JWT secrets in your own `.env`. If you change the Postgres password after the first start, run `docker compose down -v` once so the database is recreated.
- **Commands** (run inside `backend/`):
  - `npm run docker:up`: start in the background.
  - `npm run docker:down`: stop (data is kept).
  - `npm run docker:logs`: follow the logs.
  - `docker compose down -v`: stop and **delete all data**.
- **Check it works:** `docker ps` should show both as `healthy`. `docker exec educonnect-redis redis-cli ping` should answer `PONG`.

### Notes: step 0.7 explained (environment validation)

- **Problem:** everything in `process.env` is an untyped string that might be missing or wrong. Bugs from bad config appear far from their cause.
- **Solution, "fail fast":** [env.ts](backend/src/config/env.ts) defines a **Zod schema** describing each variable (type, range, default). At startup it validates `process.env`; if anything is invalid it prints every problem and exits.
- **What each piece does:**
  - `dotenv/config` loads `backend/.env` into `process.env`.
  - `z.coerce.number()` turns the string `"5000"` into the number `5000`.
  - `.default(...)` supplies a value when the variable is absent.
  - `.min(32)` on JWT secrets rejects weak or placeholder secrets.
  - `z.infer<typeof envSchema>` gives a TypeScript type for free, so `env.PORT` is a `number` and autocompletes.
- **Rule for the whole project:** never read `process.env` directly. Always `import { env } from './config/env'`.
- **Adding a variable later:** add it to the schema, to `.env.example` and to your `.env`.
- We tested three cases: placeholder secrets (rejected), a valid `.env` (accepted), `PORT=abc` (rejected).
- Your local `.env` now has real random JWT secrets (generated with Node's `crypto`).

### Notes: step 0.8 explained (logger, app, server, health)

- **Why `app.ts` and `server.ts` are separate:**
  - [app.ts](backend/src/app.ts) only *builds* the Express app (middlewares and routes) through `createApp()`.
  - [server.ts](backend/src/server.ts) *starts* it: it opens the port, handles shutdown and catches crashes.
  - Tests (step 0.12) can import `createApp()` and call it without opening a real port.
- **Pino logger** ([logger.ts](backend/src/config/logger.ts)): fast structured logging, which replaces `console.log`.
  - Development: colored, readable lines (via `pino-pretty`).
  - Production: JSON lines, which log tools can search.
  - Levels: `debug`, `info`, `warn`, `error`, `fatal`. Usage: `logger.info('text')` or `logger.error({ err }, 'text')`.
  - `redact` hides the `Authorization` and `Cookie` headers so tokens never leak into logs.
- **pino-http** logs every request automatically: method, URL, status and response time.
- **`express.json()`** parses JSON request bodies into `req.body` (limit 1 MB).
- **`/health`** is a tiny endpoint that answers `{ status: "ok" }`. Monitors, Docker and cloud hosts use it to know the app is alive. Later we will extend it to check the database and Redis.
- **Graceful shutdown:** on Ctrl+C (`SIGINT`) or a deploy (`SIGTERM`), the server stops taking new requests, finishes the running ones, then exits. After 10 seconds it forces an exit.
- **Crash safety:** an `uncaughtException` is logged and the process exits (a restart manager revives it); an `unhandledRejection` is logged.
- **Try it:** `npm run dev`, then open http://localhost:5000/health in the browser.

### Notes: step 0.9 explained (error handling)

- **Problem:** without a plan, every controller invents its own error responses, and crashes leak stack traces to users.
- **Solution:** services *throw*, and **one** global handler turns every error into the same JSON:
  ```json
  { "success": false, "error": { "code": "NOT_FOUND", "message": "Tutor not found", "details": [] } }
  ```
  The frontend can rely on that shape everywhere.
- **[AppError](backend/src/shared/errors/AppError.ts)** is an error we *expect* and can show to the user. It carries an HTTP status, a message and a machine-readable `code`. Shortcuts: `AppError.badRequest()`, `.unauthorized()` (401), `.forbidden()` (403), `.notFound()` (404), `.conflict()` (409).
  ```ts
  if (!tutor) throw AppError.notFound('Tutor not found');
  ```
- **[error.middleware.ts](backend/src/middlewares/error.middleware.ts)** has two pieces:
  - `notFoundHandler`: any URL no route matched becomes a 404.
  - `errorHandler`: recognises `AppError`, Zod validation errors (400 with per-field details), bad JSON (400), oversized body (413), and everything else (500).
- **500 errors** are logged with the full error, but in production the client only sees "Something went wrong", so internals never leak.
- **Order matters:** both handlers are registered *last* in `app.ts`, after all routes.
- **Why no async wrapper:** Express 5 forwards errors thrown or rejected inside `async` handlers to the error middleware automatically. Older Express 4 needed `express-async-errors` or a wrapper; we don't. We tested this.
- **Tested:** AppError, an async throw, Zod validation, invalid JSON, oversized body, an unexpected crash, and an unknown route each returned the right status and JSON.

### Notes: step 0.10 explained (security middlewares)

Order in `app.ts` matters: logging → helmet → cors → compression → rate limit → body parser → routes → error handlers.

| Middleware | What it protects against |
|---|---|
| **helmet** | Sets secure HTTP headers (`X-Content-Type-Options`, `Strict-Transport-Security`, a Content-Security-Policy…) to reduce XSS, clickjacking and sniffing attacks. |
| **cors** | Browsers block a website from calling an API on another origin unless the API allows it. We allow **only** `CLIENT_URL` (your React app), with `credentials: true` for cookies. |
| **express-rate-limit** | Limits requests per IP. `apiLimiter` = 100/min for the whole API. `authLimiter` = 10 per 15 min, to be attached to login/register routes so passwords can't be brute-forced. Over the limit gives HTTP **429** in our standard error JSON. |
| **compression** | gzip-compresses responses, so they are smaller and faster. |
| `x-powered-by` off | Doesn't advertise "Express" to attackers. |
| `trust proxy` | When deployed behind a proxy, the limiter sees the real client IP, not the proxy's. |

- **Rate limiting uses memory for now.** With several server instances it must share a counter, so in a later step we will switch it to a **Redis store**.
- **CORS is a browser rule only.** Postman and curl ignore it, so it is not a replacement for authentication.
- Rate limiting is skipped when `NODE_ENV=test`, so tests aren't throttled.
- **Tested:** security headers present; request #100 onwards got 429; CORS answers only with `http://localhost:5173`, even for another origin like `evil.com`.

### Notes: step 0.11 explained (Prisma and the database)

- **What Prisma is:** an ORM. You describe tables once in [schema.prisma](backend/src/database/prisma/schema.prisma); Prisma then (1) creates SQL **migrations**, and (2) generates a **type-safe client**. Example: `prisma.user.findUnique({ where: { email } })` returns a typed `User | null`, with autocomplete, and no hand-written SQL.
- **The workflow you will repeat for every feature:**
  1. Edit `schema.prisma`.
  2. `npm run db:migrate -- --name add_tutor_profile`: creates a SQL file in `migrations/`, applies it to your DB and is committed to git.
  3. `npm run db:generate`: regenerates the client (also runs on `npm install`).
  4. Use `prisma` from `src/config/database.ts` inside repositories.
- **Migrations** are a versioned history of the DB structure. A teammate (or the production server) runs `npm run db:deploy` and gets exactly the same tables. **Never edit an applied migration**; create a new one.
- **Files:**
  - [prisma.config.ts](backend/prisma.config.ts): Prisma 7 config (schema path, migrations path, seed command, DB URL from `.env`).
  - [database.ts](backend/src/config/database.ts): the single shared `prisma` client (uses the `pg` driver adapter, required in Prisma 7).
  - [seed.ts](backend/src/database/seeds/seed.ts): inserts starter data (Jamshoro, 6 areas, 10 subjects). It uses `upsert`, so running it again never duplicates.
  - `src/database/generated/`: generated code, **git-ignored**, never edit.
- **Tables created (first migration `init`):**
  - `users` (email unique, `passwordHash`, `role` = STUDENT/PARENT/TUTOR/ADMIN, `status`).
  - `refresh_tokens` (stores only a *hash* of each token, so a DB leak can't log anyone in).
  - `cities`, `areas` (so Hyderabad later = new rows, no code change), `subjects`.
  - Tutor profiles, requests, reviews and so on arrive with their own modules.
- **Naming:** models are `PascalCase` in code; `@@map("users")` keeps SQL tables `snake_case` plural.
- **Commands:** `db:migrate`, `db:deploy`, `db:generate`, `db:seed`, `db:reset` (wipes the DB and reseeds; dev only!), `db:studio` (a browser GUI to view and edit data).
- **Version note:** `npm i prisma` currently points to an 8.0 release candidate, so we pinned stable **7.10.1** for both `prisma` and `@prisma/client`.
- `/health` now runs `SELECT 1`, so it reports `"database":"up"`, and the DB connection closes on shutdown.
- **Needs Docker running:** `npm run docker:up` first, otherwise the DB is unreachable.

---

## 5. Glossary (grows as we go)

- **Controller / Service / Repository** — see architecture above.
- **Middleware** — a function that runs before your controller (auth, validation…).
- **ORM** — library that lets you use the DB with TypeScript objects instead of raw SQL.
- **RBAC** — Role-Based Access Control: what each role (student, tutor, admin) may do.
- **Migration** — a versioned change to the DB structure, stored in git.
