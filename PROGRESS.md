# EduConnect Sindh — Build Guide & Progress Tracker

> Living document. Every step we finish gets ticked ✅ and explained here.
> Source: FYP proposal (University of Sindh, Jamshoro, 2026).

---

## 1. Tech Stack (what, why, and what's new to learn)

| Layer               | Tool                                                            | Why                                                    | New?         |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------ | ------------ |
| Runtime / language  | Node.js + **TypeScript** (strict)                               | Type safety catches bugs before running                | Learn basics |
| Web framework       | **Express 5**                                                   | Simple, popular, you chose it                          | —            |
| Database            | **PostgreSQL**                                                  | Relational data (users, tutors, requests, reviews)     | —            |
| ORM                 | **Prisma**                                                      | Type-safe DB access + migrations + schema file         | **New**      |
| Validation          | **Zod**                                                         | Validate request bodies; types come for free           | **New**      |
| Auth                | JWT (access + refresh), **argon2** hashing, RBAC                | Proposal requirement                                   | Learn        |
| Cache / queue store | **Redis**                                                       | Caching, rate-limit, refresh tokens, job queue backend | **New**      |
| Background jobs     | **BullMQ** (on Redis)                                           | Emails, notifications, AI calls off the request path   | **New**      |
| Real-time           | **Socket.IO**                                                   | Live notifications / class updates                     | **New**      |
| Logging             | **Pino**                                                        | Fast structured JSON logs                              | **New**      |
| Security            | helmet, cors, express-rate-limit                                | Standard hardening                                     | —            |
| API docs            | **Swagger / OpenAPI**                                           | Professional, testable API docs                        | **New**      |
| Testing             | **Vitest + Supertest**                                          | Fast unit + API tests                                  | **New**      |
| Code quality        | ESLint, Prettier, **Husky + lint-staged**, Conventional Commits | Consistent, clean repo                                 | **New**      |
| DevOps              | **Docker Compose** (Postgres + Redis), GitHub Actions CI        | One-command setup, auto checks                         | **New**      |
| File storage        | Local `uploads/` now → S3/Cloudinary later                      | CNIC/verification docs (private!)                      | —            |

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
- ✅ 0.12 Vitest + Supertest, first test (`/health`)
- ✅ 0.13 Swagger docs at `/api/docs`
- ✅ 0.14 GitHub Actions CI (lint + test + build)

### Phase 1 — Core modules (matches proposal weeks)

- ✅ 1.1 Auth & roles (register, login, JWT access/refresh, RBAC)
- ✅ 1.2 Users (profile update, change password, admin list + suspend)
- ✅ 1.3 Tutor profile (+ locations/areas)
- ✅ 1.4 Verification (upload docs, admin approve/reject)
- ✅ 1.5 Search & filters (+ Redis cache)
- ✅ 1.6 Requests, shortlist, matching/recommendations
- ✅ 1.7 Reviews & ratings (+ moderation)
- ✅ 1.8 Notifications (BullMQ + Socket.IO)

### Frontend track

- ✅ F1 Foundation + auth (Vite, Tailwind, Redux Toolkit, routing, guards)
- ⬜ F2 Tutor search and profile pages
- ⬜ F3 Requests, shortlist, notification bell (Socket.IO)
- ⬜ F4 Tutor dashboard, profile editing, verification upload
- ⬜ F5 Admin screens

### Phase 2 — Learning platform

- ⬜ 2.1 Courses, lessons, enrollment, progress
- ⬜ 2.2 Virtual class scheduling
- ⬜ 2.3 AI learning assistant
- ⬜ 2.4 Admin dashboard APIs

### Phase 3 — Polish

- ⬜ 3.1 Deployment (Docker, cloud demo)
- ⬜ 3.2 Final docs, ERD, viva notes

### Changelog

| Date       | Step     | Notes                                                                                                                                                                                                                                                      |
| ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-18 | 0.1, 0.2 | Stack chosen; `backend/` folder structure created                                                                                                                                                                                                          |
| 2026-10-18 | 0.3, 0.4 | Git repo at project root; TypeScript + tsx; scripts `dev`, `build`, `start`, `typecheck` verified                                                                                                                                                          |
| 2026-10-18 | 0.5      | ESLint 10, Prettier, Husky, lint-staged; TypeScript pinned to 6.0; first commit                                                                                                                                                                            |
| 2026-10-21 | 0.6      | Docker Compose: Postgres 16 (host port 5433) + Redis 7; `.env.example`; npm `docker:*` scripts                                                                                                                                                             |
| 2026-10-21 | 0.7      | Zod env validation in `src/config/env.ts` (+ dotenv); fails fast on bad config                                                                                                                                                                             |
| 2026-10-21 | 0.8      | Express 5 app, Pino logging, `/health`, graceful shutdown; server runs on port 5000                                                                                                                                                                        |
| 2026-10-21 | 0.9      | `AppError`, global error handler, 404 handler; consistent JSON error shape                                                                                                                                                                                 |
| 2026-10-21 | 0.10     | helmet, CORS (only `CLIENT_URL`), compression, rate limiters (`apiLimiter`, `authLimiter`)                                                                                                                                                                 |
| 2026-10-21 | 0.11     | Prisma 7.10 + PostgreSQL: `init` migration (users, refresh_tokens, cities, areas, subjects), seed, `/health` checks DB                                                                                                                                     |
| 2026-10-21 | 0.12     | Vitest 5 + Supertest: 8 tests (health, 404, bad JSON, error handler), coverage report                                                                                                                                                                      |
| 2026-10-21 | 0.13     | Swagger UI at `/api/docs` (OpenAPI 3 spec in `config/swagger.ts`), 2 more tests (10 total)                                                                                                                                                                 |
| 2026-10-21 | 0.14     | GitHub Actions workflow `backend-ci.yml` (format, lint, typecheck, test, build). **Phase 0 complete**                                                                                                                                                      |
| 2026-10-21 | 1.1      | Auth: register/login/refresh/logout/me, argon2, JWT access + rotating refresh cookie, RBAC; 36 tests                                                                                                                                                       |
| 2026-10-21 | 1.2      | Users: update profile, change password, admin list (pagination/filters) and suspend/reactivate; 51 tests                                                                                                                                                   |
| 2026-10-21 | 1.3      | Tutor profile: `tutor_profiles` table (+ subject/area join tables), `GET/PUT /tutors/me`, public `GET /tutors/:id`, `/catalog/cities` and `/catalog/subjects`; 69 tests                                                                                    |
| 2026-10-21 | 1.4      | Verification: private document upload (multer, magic-byte check, 5 MB), submit, admin approve/reject with reason, protected download; 85 tests                                                                                                             |
| 2026-10-21 | 1.5      | Search: `GET /tutors` with filters, sorting, pagination; Redis cache (60 s, version-key invalidation, fail-open); 105 tests                                                                                                                                |
| 2026-10-21 | 1.6      | Requests (send, accept, decline, cancel), shortlist, scored recommendations; contact shared only after accept; 117 tests                                                                                                                                   |
| 2026-10-21 | 1.7      | Reviews: accepted-request-only, one per author, admin hide/unhide, cached ratingAvg/ratingCount, search `minRating` + `sort=rating`; 124 tests; added `docs/ARCHITECTURE.md`                                                                               |
| 2026-10-21 | 1.8      | Notifications: BullMQ queue + worker, Socket.IO live push (JWT-authenticated rooms), saved in DB, 4 REST endpoints, triggers on requests/reviews/verification; 131 tests; added `docs/DEPENDENCIES.md`                                                     |
| 2026-10-21 | F1       | Frontend foundation: Vite + React 19 + TS strict, Tailwind 4, Redux Toolkit + RTK Query, React Router, RHF + Zod; auth (login/register/logout, session restore, single-flight refresh, route guards); 8 tests; `frontend-ci.yml`; added `docs/FRONTEND.md` |

### Notes: step F1 (Frontend foundation + auth) explained

- **Full explanation:** [docs/FRONTEND.md](./docs/FRONTEND.md) (structure, login flow, token security, libraries).
- **Token safety:** access token lives only in Redux memory; the refresh token is an httpOnly cookie. On reload `AuthBootstrap` calls `/auth/refresh` to restore the session.
- **Single-flight refresh:** refresh tokens rotate with reuse detection, so concurrent refreshes (StrictMode, parallel 401s) share one request.
- **Auto re-auth:** RTK Query base query retries a request once after a 401 and a successful refresh.
- **Dev proxy:** Vite forwards `/api` and `/socket.io` to port 5000, so the cookie is same-origin.
- **Forms:** Zod schemas mirror backend rules; server validation `details` are mapped onto fields.
- **Next:** F2 tutor search and profile pages.

### Notes: Figma design applied to auth (F1b)

- Source: the exported Figma frames (Login/Register, desktop and mobile). The mockups sit in `docs/design-src/` for reference; the photos are cropped into `frontend/public/`.
- Theme tokens (in `src/index.css` `@theme`): teal `brand-500 #47babb`, `brand-300 #92d6d5`, Poppins font (`@fontsource/poppins`), pill-shaped inputs and buttons, password show/hide toggle.
- `AuthShell` is the shared split layout: photo panel on desktop (hidden on mobile), Login/Register pill tabs. Login and Register use it and sit outside the navbar layout.
- The design says "User name" but the backend logs in with email, so the field is Email. "Remember me" and "Forgot password" are left out until the backend supports them.
- The Figma file only had auth screens; all other pages will reuse these tokens and components.

### Notes: step 1.8 (Notifications, BullMQ, Socket.IO) explained

- **Full beginner explanation:** [docs/DEPENDENCIES.md](./docs/DEPENDENCIES.md) (what BullMQ and Socket.IO are, with diagrams) and section 7b of [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).
- **Flow:** a service calls `notify()` → job added to the Redis queue → worker saves a `notifications` row in PostgreSQL → worker emits a `notification` event to the room `user:<id>`.
- **Why both a database row and a socket event?** Sockets only reach people who are online. The row is the permanent copy (the bell list); the socket is a live bonus.
- **Why a queue at all?** The request returns immediately; delivery happens in the background with 3 retries and exponential backoff, and jobs survive an API restart because they live in Redis.
- **Never breaks the main action:** `notify()` catches every error. If the queue (Redis) is down it delivers inline, so the notification is not lost.
- **Socket security:** the browser connects with `auth: { token: accessToken }`; middleware verifies the JWT, otherwise `connect_error: Unauthorized`. Each user joins a private room, so events reach only their own tabs and devices.
- **Triggers:** request received (to tutor), accepted or declined (to student), first review (to tutor; edits do not notify again), verification approved or rejected (to tutor).
- **Endpoints:** `GET /notifications` (+ `unreadOnly`), `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`. Other people's notifications answer 404.
- **Tests:** a real Socket.IO client and a real worker run in the test; queue keys use a separate `bull-test` prefix so tests never touch development jobs. `tests/setup.ts` closes the queue connection after each test file.
- **Shutdown:** the server closes sockets, waits for the running worker jobs, then closes Redis and the database.
- **Limit:** if both the queue and the database fail at once the notification is lost (logged). A transactional outbox would fix that but is overkill here.
- **Flaky note:** one full-suite run failed once under load and passed in four later runs. If it appears again, check timing-based waits in `notifications.test.ts`.

### Notes: step 1.7 (Reviews and ratings) explained

- **Who can review:** only a student or parent whose request to that tutor was `ACCEPTED`. This blocks fake reviews from strangers.
- **One per author per tutor:** `@@unique([authorId, tutorProfileId])`. `PUT /tutors/:id/reviews` is an upsert, so sending it again edits your review.
- **Cached rating:** `TutorProfile.ratingAvg` and `ratingCount` are updated in the **same transaction** as every review write, so search can filter and sort without aggregating all reviews each time. The average is rounded to one decimal.
- **Moderation:** admin `POST /reviews/:id/hide` (with an optional note) removes the review from the public list and the average; `unhide` restores it. Editing a hidden review does not unhide it, so authors cannot bypass moderation.
- **Privacy:** the public list shows author name, rating and comment only. `moderationNote` and `status` are for admins.
- **Search:** results now include `ratingAvg` and `ratingCount`, plus `minRating` filter and `sort=rating` (ties broken by review count, then id). Every review change invalidates the search cache.
- **Not yet:** `GET /tutors/:id` does not include the rating; the frontend can combine it with the search summary or we can add it later.

### Notes: step 1.6 (Requests, shortlist, recommendations) explained

- **Request lifecycle:** `PENDING → ACCEPTED | DECLINED | CANCELLED`. A student or parent sends it, the tutor accepts or declines, the sender can cancel. Only `PENDING` requests can change.
- **Race safety:** transitions use `updateMany ... WHERE status = 'PENDING'` and check the changed-row count. 0 rows means someone got there first, so the API returns 409 (same trick as verification).
- **Validation before saving:** the tutor must be published with an ACTIVE account, teach the subject, and offer the mode. HOME needs an area that the tutor serves.
- **Abuse limits:** one pending request per tutor and subject, and at most 10 pending per student. The duplicate check is in the service, so a perfectly simultaneous double-click could slip through (a partial unique index would fix that; Prisma cannot model it, so it would need raw SQL).
- **Privacy:** email and phone of the other side appear only when status is `ACCEPTED`. This is how the platform keeps contact details protected until the tutor agrees.
- **No id probing:** a tutor responding to someone else's request gets 404, not 403.
- **Shortlist:** `PUT /shortlist/:tutorId` is idempotent (upsert on a unique pair). Unpublished or suspended tutors disappear from the list.
- **Recommendations:** `GET /tutors/recommended?subjectId=..&budget=..&areaId=..&mode=..`. Hard filters first (subject, mode, area for home), then a score out of 100 computed in code: verified 35, within budget 30 (slightly above gets half), experience up to 20, area 15. Each result carries `reasons`, so the ranking is explainable (good for the viva). Results use the same Redis cache.
- **Route order:** `/tutors/recommended` lives in the search router, mounted before `/tutors/:id`.
- **Not yet:** notifications on status changes come in step 1.8.

### Notes: step 1.5 (Search + Redis) explained

- **Endpoint:** `GET /api/v1/tutors?q=physics&subjectId=..&areaId=..&mode=HOME&minRate=500&maxRate=1500&minExperience=2&verifiedOnly=true&sort=priceAsc&page=1&limit=12`. Every filter is optional and validated with Zod (bad values give 400, `limit` max 50).
- **Always filtered:** only `isPublished` tutors whose user account is `ACTIVE` appear. Contact details and the full bio are never in list results.
- **Mode logic:** `mode=HOME` matches tutors who teach HOME **or** BOTH (same for ONLINE).
- **Stable sorting:** every sort adds `id` as a tie-breaker, otherwise pages could repeat or skip rows when values are equal.
- **What is Redis here?** An in-memory key-value store, much faster than PostgreSQL for repeated reads. Search is the busiest public endpoint, so we use the **cache-aside** pattern: check Redis, on a miss query PostgreSQL and store the result with a **60 s TTL**.
- **Invalidation (the hard part of caching):** instead of finding and deleting keys, every key contains a version number (`cache:tutor-search:v73:<hash of the query>`). When something visible in search changes (tutor saves profile, admin approves/rejects, user suspended/reactivated) we `INCR` the version, so old keys are instantly unreachable and expire by themselves.
- **Same query, same key:** the query object is serialised with sorted keys and hashed (SHA-1), so `?a=1&b=2` and `?b=2&a=1` share one entry.
- **Fail-open:** the Redis client uses `enableOfflineQueue: false` and `maxRetriesPerRequest: 1`, so if Redis is down requests fail fast and the API answers from PostgreSQL (tested). A cache must never be able to take the site down.
- **Measured:** first request ~640 ms (cold DB connection), repeat ~10 ms.
- **Tests:** `fileParallelism: false` in `vitest.config.mts`, because test files share one database and Redis, and the cache tests read the global version counter.
- **Not yet:** filtering/sorting by rating comes with Reviews (step 1.7). Postgres `ILIKE` is fine at this scale; full-text search or trigram indexes can come later if needed.

### Notes: step 1.4 (Verification) explained

- **Why:** the proposal's core promise is _trusted_ tutors. A tutor uploads CNIC (front and back) and a degree, an admin reviews them, and only then does the profile carry the **VERIFIED** badge.
- **Status flow:** `UNVERIFIED → PENDING → VERIFIED` or `REJECTED → (fix and resubmit) → PENDING`. While `PENDING` or `VERIFIED` the tutor cannot change documents (409), so an admin never reviews files that change underneath them.
- **Upload security (important for the viva):**
  - **multer** parses `multipart/form-data`; files are kept in memory with a **5 MB limit**.
  - The file type is checked by its **magic bytes** (`%PDF-`, PNG and JPEG signatures), not by filename or `Content-Type`, because those are chosen by the uploader. A `.pdf` containing a script is rejected.
  - The file is saved under a **random UUID name** that we generate, so a malicious filename like `../../x` can never choose where it lands (path traversal). The original name is kept only in the DB for display.
  - Documents live in `uploads/.private` and are **never served statically**. They can only be fetched through `GET /verification/documents/:id/file`, which checks that you are the owner or an admin. Others get 404, so ids cannot be probed.
  - Downloads use `Content-Disposition: attachment` and `Cache-Control: no-store`.
- **DB holds metadata, disk holds the file.** If the DB insert fails, the saved file is removed again. Deleting a user cascades the DB rows, but files need explicit cleanup (the tests do this).
- **Race safety:** approve/reject use `updateMany ... WHERE status = 'PENDING'`, so two admins cannot decide the same request twice; the second gets 409.
- **Gotcha:** Express `sendFile` refuses paths containing a dot-folder (like `.private`) unless you pass `dotfiles: 'allow'`.
- **Later:** on a real server these files should go to object storage (S3-style) instead of local disk; the `documentStorage` helper is the only place that would change.

### Notes: step 1.3 (Tutor profile) explained

- **Data model:** `User 1—0..1 TutorProfile`. A tutor has one profile (`userId` is `@unique`). `Subject` and `Area` are **many-to-many** with the profile: Prisma creates hidden join tables (`_SubjectToTutorProfile`, `_AreaToTutorProfile`), and we manage them with `connect` / `set`.
- **Migration:** `npm run db:migrate -- --name tutor_profile` turned the schema change into SQL. After changing `schema.prisma` always run `npm run db:generate` too, so the TypeScript client knows the new models.
- **`PUT /tutors/me` is an upsert:** creates the profile the first time and replaces it afterwards (PUT = replace whole resource, so the client sends the full profile). `set` replaces the subject/area lists.
- **Whitelisted fields:** `verificationStatus` is not in the schema, so a tutor cannot verify themselves. Only an admin will change it (step 1.4).
- **Draft vs published:** `isPublished: false` keeps the profile private; the public endpoint answers 404 for drafts (it does not reveal that a draft exists). Home tutoring needs at least one area to be published.
- **Privacy:** the public DTO (`toTutorDto`) has the name but no email or phone. Contact happens through requests (step 1.6).
- **Route order matters:** `/tutors/me` is declared before `/tutors/:id`, otherwise Express would treat "me" as an id.
- **Catalog:** `/catalog/cities` and `/catalog/subjects` are public read-only lists for the frontend dropdowns.
- **Validation of ids:** we count how many of the given subject/area ids exist; a mismatch gives a clear 400 instead of a database error.

### Notes: step 1.2 (Users) explained

- **Whitelisting input:** `PATCH /users/me` only accepts `fullName` and `phone` (Zod strips unknown keys), so a user can never send `role: "ADMIN"` to promote themselves. This blocks _mass assignment_ attacks.
- **`/me` routes** act on the logged-in user taken from the token, never from an id in the URL, so users can't edit someone else.
- **Change password:** verifies the current password, rejects reuse, hashes the new one and revokes all refresh tokens (every device logged out).
- **Admin list:** `GET /users?page=1&limit=20&role=TUTOR&status=ACTIVE&search=ali`. The response is `{ data: [...], meta: { page, limit, total, totalPages } }`. The list and the count run in one DB transaction. `limit` is capped at 100 so nobody can request the whole table. This pagination shape is reused by later modules.
- **Suspend:** admin only; you cannot suspend yourself or another admin. Suspending revokes refresh tokens, so the user is locked out within 15 minutes (when the access token expires).
- **Query validation:** `req.query` is read-only in Express 5, so the controller parses it with Zod directly instead of replacing it.

### Notes: step 1.1 (Auth) explained

- **Layers per module:** `routes → controller → service → repository`. Routes map URLs, controllers handle HTTP, services hold business rules, repositories are the only code that talks to Prisma.
- **Passwords:** hashed with **argon2id** (never stored plain). Login for an unknown email still runs a dummy hash, and returns the same error as a wrong password, so attackers can't discover which emails exist.
- **Two tokens:**
  - _Access token_: short-lived (15 min) JWT sent in `Authorization: Bearer ...`. Stateless, no DB hit.
  - _Refresh token_: random opaque string in an **httpOnly cookie** (JS can't read it, so XSS can't steal it). Only its HMAC hash is stored in `refresh_tokens`.
- **Rotation + reuse detection:** every refresh issues a new refresh token and revokes the old one. If a revoked token is used again (likely stolen), all of that user's tokens are revoked.
- **RBAC:** `authenticate` verifies the JWT and sets `req.user`; `authorize('ADMIN')` checks the role (401 = not logged in, 403 = not allowed).
- **Registration** allows only STUDENT, PARENT, TUTOR. ADMIN is created by the seed (`ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`, then `npm run db:seed`).
- **Bug the tests caught:** the plain `password` field was being spread into the Prisma `create` call (500 error). Fixed by destructuring it out. This is why we write tests.
- **Known limit:** a suspended user keeps access up to 15 min (until the access token expires).

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

| Tool            | Job                                                                   | Config file                     |
| --------------- | --------------------------------------------------------------------- | ------------------------------- |
| **Prettier**    | Formats code (quotes, spacing, line width). Zero debates about style. | `.prettierrc.json`              |
| **ESLint**      | Finds bugs and bad patterns (unused vars, `==`, forgotten imports…).  | `eslint.config.mjs`             |
| **lint-staged** | Runs ESLint + Prettier only on files you staged. Fast.                | `lint-staged` in `package.json` |
| **Husky**       | Git hook: runs lint-staged automatically on every `git commit`.       | `.husky/pre-commit`             |

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
  - [app.ts](backend/src/app.ts) only _builds_ the Express app (middlewares and routes) through `createApp()`.
  - [server.ts](backend/src/server.ts) _starts_ it: it opens the port, handles shutdown and catches crashes.
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
- **Solution:** services _throw_, and **one** global handler turns every error into the same JSON:
  ```json
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "Tutor not found",
      "details": []
    }
  }
  ```
  The frontend can rely on that shape everywhere.
- **[AppError](backend/src/shared/errors/AppError.ts)** is an error we _expect_ and can show to the user. It carries an HTTP status, a message and a machine-readable `code`. Shortcuts: `AppError.badRequest()`, `.unauthorized()` (401), `.forbidden()` (403), `.notFound()` (404), `.conflict()` (409).
  ```ts
  if (!tutor) throw AppError.notFound("Tutor not found");
  ```
- **[error.middleware.ts](backend/src/middlewares/error.middleware.ts)** has two pieces:
  - `notFoundHandler`: any URL no route matched becomes a 404.
  - `errorHandler`: recognises `AppError`, Zod validation errors (400 with per-field details), bad JSON (400), oversized body (413), and everything else (500).
- **500 errors** are logged with the full error, but in production the client only sees "Something went wrong", so internals never leak.
- **Order matters:** both handlers are registered _last_ in `app.ts`, after all routes.
- **Why no async wrapper:** Express 5 forwards errors thrown or rejected inside `async` handlers to the error middleware automatically. Older Express 4 needed `express-async-errors` or a wrapper; we don't. We tested this.
- **Tested:** AppError, an async throw, Zod validation, invalid JSON, oversized body, an unexpected crash, and an unknown route each returned the right status and JSON.

### Notes: step 0.10 explained (security middlewares)

Order in `app.ts` matters: logging → helmet → cors → compression → rate limit → body parser → routes → error handlers.

| Middleware             | What it protects against                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **helmet**             | Sets secure HTTP headers (`X-Content-Type-Options`, `Strict-Transport-Security`, a Content-Security-Policy…) to reduce XSS, clickjacking and sniffing attacks.                                                                             |
| **cors**               | Browsers block a website from calling an API on another origin unless the API allows it. We allow **only** `CLIENT_URL` (your React app), with `credentials: true` for cookies.                                                            |
| **express-rate-limit** | Limits requests per IP. `apiLimiter` = 100/min for the whole API. `authLimiter` = 10 per 15 min, to be attached to login/register routes so passwords can't be brute-forced. Over the limit gives HTTP **429** in our standard error JSON. |
| **compression**        | gzip-compresses responses, so they are smaller and faster.                                                                                                                                                                                 |
| `x-powered-by` off     | Doesn't advertise "Express" to attackers.                                                                                                                                                                                                  |
| `trust proxy`          | When deployed behind a proxy, the limiter sees the real client IP, not the proxy's.                                                                                                                                                        |

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
  - `refresh_tokens` (stores only a _hash_ of each token, so a DB leak can't log anyone in).
  - `cities`, `areas` (so Hyderabad later = new rows, no code change), `subjects`.
  - Tutor profiles, requests, reviews and so on arrive with their own modules.
- **Naming:** models are `PascalCase` in code; `@@map("users")` keeps SQL tables `snake_case` plural.
- **Commands:** `db:migrate`, `db:deploy`, `db:generate`, `db:seed`, `db:reset` (wipes the DB and reseeds; dev only!), `db:studio` (a browser GUI to view and edit data).
- **Version note:** `npm i prisma` currently points to an 8.0 release candidate, so we pinned stable **7.10.1** for both `prisma` and `@prisma/client`.
- `/health` now runs `SELECT 1`, so it reports `"database":"up"`, and the DB connection closes on shutdown.
- **Needs Docker running:** `npm run docker:up` first, otherwise the DB is unreachable.

### Notes: where the data lives

- Data is in the **Docker** Postgres container (`educonnect-postgres`, volume `backend_postgres_data`), **not** in the Postgres installed on Windows.
- Docker Postgres is on port **5433**; the Windows one is on 5432.
- **pgAdmin:** register a new server with host `localhost`, port **5433**, database `educonnect`, user `educonnect`, password = `POSTGRES_PASSWORD` from `backend/.env`.
- Quick alternatives: `npm run db:studio` (browser GUI) or `docker exec -it educonnect-postgres psql -U educonnect -d educonnect`.
- `docker compose down` keeps the data; `docker compose down -v` and `npm run db:reset` delete it.

### Notes: step 0.12 explained (automated testing)

- **Why test:** a test is code that checks your code. When you change something next month, running the tests tells you in seconds if you broke something. It also impresses examiners.
- **Vitest** is the test runner (fast, TypeScript-friendly). **Supertest** calls your Express app directly in memory, so there's no port and no real HTTP.
- **Key design payoff:** this works because `createApp()` is separate from `server.ts` (step 0.8).
- **Test layout:**
  - `tests/unit/`: tests of one piece in isolation, no database ([errorHandler.test.ts](backend/tests/unit/errorHandler.test.ts) uses a tiny app with routes that throw on purpose).
  - `tests/integration/`: the real app plus the real database ([health.test.ts](backend/tests/integration/health.test.ts)).
  - `tests/e2e/` stays empty until later.
- **Anatomy of a test** (Arrange, Act, Assert):
  ```ts
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/does-not-exist"); // act
    expect(res.status).toBe(404); // assert
  });
  ```
- **[vitest.config.mts](backend/vitest.config.mts)** sets `NODE_ENV=test` (this also silences logs and disables rate limiting) and fallback env values, so tests run on a fresh clone or in CI without a `.env`.
- **Commands:** `npm test` (run once), `npm run test:watch` (re-run on save), `npm run test:coverage` (shows which lines are tested; currently about 84%).
- **Rule going forward:** every new endpoint gets tests (happy path plus the failure cases) before we tick it off.
- Integration tests need Docker Postgres running (`npm run docker:up`).

### Notes: step 0.13 explained (API documentation)

- **What it is:** an **OpenAPI** spec is a standard JSON description of your API (URLs, inputs, outputs, errors). **Swagger UI** turns it into an interactive web page where anyone can read the docs and click **Try it out** to call an endpoint. The frontend developer, your supervisor and examiners all use it instead of guessing.
- **Where:** http://localhost:5000/api/docs (the raw JSON is at `/api/docs.json`). It is **hidden in production**.
- **[swagger.ts](backend/src/config/swagger.ts)** holds the spec: API info, the `/health` endpoint, and reusable pieces under `components`:
  - `schemas.Error`: our standard error shape.
  - `responses.BadRequest / Unauthorized / Forbidden / NotFound / InternalError`: reuse with `$ref` so we never repeat ourselves.
  - `securitySchemes.bearerAuth`: the JWT "Authorize" button (used from step 1.1).
- **Workflow from now on:** when you add an endpoint, add its entry under `paths` (or a per-module file merged into it) in the **same commit**. Docs and code stay in sync.
- **Gotcha we checked:** helmet's strict Content-Security-Policy could break the Swagger page. It doesn't, because Swagger UI loads its scripts from our own origin. We confirmed in a real browser.
- 2 tests ([docs.test.ts](backend/tests/integration/docs.test.ts)) check the spec and the UI page load.

### Notes: step 0.14 explained (CI: Continuous Integration)

- **What CI is:** a robot on GitHub that, on every `git push` and pull request, builds your project on a clean Linux machine and runs all the checks. If anything fails, you see a red ❌ right on the commit. "Works on my machine" stops being an excuse.
- **[backend-ci.yml](.github/workflows/backend-ci.yml)** does, in order:
  1. Starts temporary **Postgres** and **Redis** containers (`services:`).
  2. `npm ci`: installs exactly what `package-lock.json` says (stricter and faster than `npm install`).
  3. `prisma generate` and `prisma migrate deploy`: builds the DB tables, which also proves your migrations work from scratch.
  4. `format:check`, `lint`, `typecheck`, `test`, `build`.
- It only triggers when files in `backend/` change, and cancels older runs of the same branch.
- CI uses throwaway passwords and secrets written in the workflow, never your real `.env`. Real secrets (later, for deployment) go in **GitHub → Settings → Secrets**, never in files.
- All steps were verified to pass locally; the first real run happens when we push to GitHub.

### Phase 0 is complete 🎉

You now have: strict TypeScript, linting and formatting with commit hooks, Docker Postgres and Redis, validated config, logging, error handling, security middlewares, Prisma with migrations and seed, tests, API docs, and CI.

---

## 5. Glossary (grows as we go)

- **Controller / Service / Repository** — see architecture above.
- **Middleware** — a function that runs before your controller (auth, validation…).
- **ORM** — library that lets you use the DB with TypeScript objects instead of raw SQL.
- **RBAC** — Role-Based Access Control: what each role (student, tutor, admin) may do.
- **Migration** — a versioned change to the DB structure, stored in git.
