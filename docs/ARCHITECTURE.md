# EduConnect Sindh: How the Backend Works

A guided tour of the code and data flow. Read it top to bottom once, then use it as a reference.

## 1. The big picture

```
React app (later)
      │  HTTP + JSON
      ▼
Express API (backend/src)  ──►  PostgreSQL  (permanent data, via Prisma)
      │
      ├──────────────────────►  Redis       (fast temporary cache)
      └──────────────────────►  uploads/    (private verification files)
```

- **PostgreSQL** is the source of truth: users, profiles, requests, reviews.
- **Redis** only speeds things up. If it disappears, the API still works (just slower).
- **Prisma** is the translator: TypeScript calls in, SQL out, typed results back.

## 2. Folder map and each layer's job

```
backend/src
├── server.ts        starts the app: connects Redis, listens on a port, shuts down cleanly
├── app.ts           builds Express: security + parsing middleware, docs, /health, routes, errors
├── routes.ts        mounts every module under /api/v1
├── config/          env (validated once), database, redis, logger, swagger
├── middlewares/     authenticate, authorize, validateBody, rate limits, upload, error handler
├── modules/<name>/  one folder per feature (see below)
└── shared/          AppError, password/token helpers, file-type check
```

Every feature module has the same files. This is the rule that keeps the project readable:

| File              | Job                                        | Must NOT                |
| ----------------- | ------------------------------------------ | ----------------------- |
| `*.routes.ts`     | URL + HTTP method, which middleware to run | contain logic           |
| `*.controller.ts` | read `req`, call the service, write `res`  | talk to the database    |
| `*.service.ts`    | business rules ("is this allowed?")        | know about HTTP details |
| `*.repository.ts` | the only place that calls Prisma           | contain business rules  |
| `*.schema.ts`     | Zod shapes for validating input            |                         |
| `*.docs.ts`       | Swagger documentation                      |                         |

Why split it? You can test rules without HTTP, swap the database layer without touching rules, and always know where to look.

## 3. Life of one request

Example: a student sends `POST /api/v1/requests`.

1. **`app.ts` middleware chain**, in order: logger → helmet (security headers) → cors → compression → rate limit → JSON body parser → cookie parser.
2. **`routes.ts`** matches `/requests` and hands over to `requests.routes.ts`.
3. **`authenticate`** reads the `Authorization: Bearer <JWT>` header, verifies the signature and expiry, and sets `req.user = { id, role }`. Bad or missing token → 401.
4. **`authorize('STUDENT','PARENT')`** checks `req.user.role`. Wrong role → 403.
5. **`validateBody(createRequestSchema)`** checks the JSON with Zod. Wrong shape → 400 with details. Unknown fields are stripped, so clients can't sneak in extra data.
6. **Controller** calls `requestsService.create(userId, body)`.
7. **Service** applies the rules: tutor published? subject taught? mode offered? no duplicate? under the 10-pending cap? A broken rule throws an `AppError` (404, 400 or 409).
8. **Repository** runs the Prisma query and returns data.
9. **Controller** responds `201 { success: true, data: { request } }`.
10. **Any thrown error** (in any step) lands in `errorHandler`, which turns it into one consistent JSON shape: `{ success: false, error: { code, message } }`. Express 5 forwards async errors automatically.

Response shapes are always the same, so the frontend needs only one parser.

## 4. Authentication flow

```
register/login ─► server returns accessToken (JWT, short life, in JSON)
                  + refresh token (long life, httpOnly cookie)
every API call ─► Authorization: Bearer <accessToken>
token expires  ─► POST /auth/refresh (cookie sent automatically)
                  ─► new access token + NEW refresh token (rotation)
logout         ─► refresh token revoked
```

- Passwords are hashed with **Argon2**; the plain password is never stored or logged.
- Only an **HMAC hash** of the refresh token is stored, so a database leak cannot be used to log in.
- **Rotation + reuse detection:** each refresh token works once. If an old one is replayed (it was stolen), all sessions of that user are revoked.
- **httpOnly cookie** means JavaScript on the page cannot read the refresh token (protects against XSS theft).
- Roles: `STUDENT`, `PARENT`, `TUTOR`, `ADMIN`. Admin accounts are created by the seed, never through public registration.

## 5. The data model (what links to what)

```
User ─┬─ 1:1 ─ TutorProfile ─┬─ n:m ─ Subject
      │                      ├─ n:m ─ Area ── City
      │                      ├─ 1:n ─ VerificationDocument
      │                      ├─ 1:n ─ Review (rating 1-5)
      │                      └─ ratingAvg / ratingCount (cached copy)
      ├─ 1:n ─ ShortlistItem ──► TutorProfile
      ├─ 1:n ─ TutorRequest  ──► TutorProfile  (+ Subject, Area)
      ├─ 1:n ─ Review (author)
      └─ 1:n ─ RefreshToken
```

Rules the database itself enforces (not just code): unique email, one profile per user, one shortlist row per (student, tutor), one review per (author, tutor), and cascade delete (deleting a user removes their rows).

Changing the model: edit `schema.prisma` → `npm run db:migrate -- --name what_changed` (creates and applies SQL, kept in git) → `npm run db:generate` (updates the TypeScript types).

## 6. Business flows end to end

### Tutor onboarding and trust

```
Tutor registers ─► PUT /tutors/me (profile, subjects, areas, isPublished)
              ─► upload documents (CNIC front/back + degree)
              ─► submit for verification          UNVERIFIED → PENDING
Admin         ─► approve → VERIFIED (badge)   or   reject + reason → REJECTED
Tutor fixes and resubmits after a rejection.
```

Upload safety: 5 MB limit, file type checked by magic bytes (not file name), random stored name, saved in a private folder that is never served statically, downloadable only by the owner or an admin.

### Student finds and contacts a tutor

```
GET /tutors?subjectId=..&mode=HOME&sort=rating     search (cached)
GET /tutors/recommended?subjectId=..&budget=..      scored matches with reasons
PUT /shortlist/:tutorId                            save for later
POST /requests                                      PENDING
   Tutor: GET /requests/incoming → accept | decline   (409 if already answered)
   Student: cancel while PENDING
ACCEPTED ─► both sides can now see each other's email and phone
```

### Reviews

```
ACCEPTED request ─► PUT /tutors/:id/reviews  {rating 1-5, comment}
                    (create or edit your single review)
                    └─ same DB transaction recalculates ratingAvg / ratingCount
Admin moderation  ─► POST /reviews/:id/hide   (leaves public list AND the average)
                  ─► POST /reviews/:id/unhide
Public            ─► GET /tutors/:id/reviews  (visible ones only)
Search            ─► minRating filter, sort=rating
```

Why store `ratingAvg` on the tutor? Sorting and filtering by rating then needs no join or aggregate over all reviews on every search. The cost is keeping it in sync, which is why every review change runs the write and the recalculation in one **transaction** (all or nothing).

Why "accepted request required"? It stops fake reviews from strangers; a review means the student actually dealt with this tutor.

## 6b. Phase 2 flows: classes, assistant, admin

```
Book a seat   POST /classes/:id/book ─► transaction: lock class row (FOR UPDATE) ─► count bookings ─► insert or 409
Join          GET /classes/:id/join  ─► owner / booked student / admin only (meeting link is never in lists)
Ask assistant POST /courses/:id/assistant ─► enrolled? ─► load lessons ─► LLM (if AI_API_KEY) or keyword retrieval ─► {answer, sources}
Admin stats   GET /admin/stats ─► parallel COUNT/GROUP BY + one daily sign-up query
```

## 7. Redis caching flow (cache-aside)

```
GET /tutors?...
   │
   ├─ build key  cache:tutor-search:v<version>:<hash of sorted query>
   ├─ Redis hit?  yes ─► return immediately (~10 ms)
   └─ no ─► query PostgreSQL (~100s of ms) ─► store in Redis for 60 s ─► return
```

- **Invalidation:** when anything visible in search changes (profile saved, verification decision, account suspended, review added or hidden) we increment the **version number**. Old keys become unreachable and expire by themselves. No need to hunt down and delete keys.
- **Fail-open:** if Redis is down the code skips the cache and answers from PostgreSQL. A cache must never take the site down.

## 7b. Notifications flow (BullMQ + Socket.IO)

```
service (request/review/verification)
   └─ notificationsService.notify(...)  ── adds a job ──►  Redis queue (BullMQ)
                                                              │
                                              Worker ◄────────┘  (retries 3x with backoff)
                                                │
                              ┌─────────────────┴──────────────────┐
                              ▼                                    ▼
                  INSERT notifications (PostgreSQL)      Socket.IO emit to room user:<id>
                  (history, works offline)               (instant, only if online)
```

The HTTP request returns right after the job is queued; delivery happens in the background. See [DEPENDENCIES.md](./DEPENDENCIES.md) for BullMQ and Socket.IO explained from scratch.

## 8. Security checklist (good viva material)

- Input validated with Zod everywhere; fields whitelisted (no mass assignment: a user can't set their own `role` or `verificationStatus`).
- Passwords: Argon2. Tokens: short-lived JWT + rotating hashed refresh token.
- helmet headers, CORS limited to `CLIENT_URL`, rate limiting (stricter on auth).
- Authorization checks on ownership: other people's requests and documents answer 404, so ids cannot be probed.
- Private contact data revealed only after consent (accepted request).
- Races handled in the database: `updateMany ... WHERE status='PENDING'` for transitions, unique constraints for duplicates.
- Secrets only from `.env` (git-ignored), validated at startup.

## 9. Testing flow

- `npm test` runs Vitest + Supertest against the real local PostgreSQL and Redis (Docker must be running). Tests use the full app via HTTP, so routes, middleware, services and DB are all exercised together.
- Each test file creates users with a unique email prefix and deletes them afterwards.
- CI (GitHub Actions) runs format check, typecheck, lint, tests and build on every push.

## 10. Daily workflow

1. `docker compose up -d` (Postgres + Redis), `cd backend`, `npm run dev`.
2. Open `http://localhost:<PORT>/api/docs` to try endpoints.
3. Add a feature: schema → migration → module files → routes mounted in `routes.ts` → docs → tests.
4. `npm run format`, `typecheck`, `lint`, `test`, `build`.
5. Update `PROGRESS.md`, commit with a Conventional Commit message, push.
