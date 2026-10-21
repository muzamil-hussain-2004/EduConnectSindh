# Dependencies explained

Every package in `backend/package.json`, why it exists, and where it is used. "Runtime" packages ship with the app; "dev" packages only help while building and testing.

## Runtime packages

| Package                                                    | What it is                          | Why we use it                                                                                                  |
| ---------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `express`                                                  | Web framework                       | Receives HTTP requests, runs middleware, sends responses. The core of the API (v5: async errors are automatic) |
| `zod`                                                      | Schema validation                   | Checks every input (body, query, params, env vars) and gives typed data                                        |
| `@prisma/client` + `@prisma/adapter-pg` + `pg`             | ORM + PostgreSQL driver             | Type-safe database queries. `pg` is the actual driver; the adapter plugs it into Prisma 7                      |
| `argon2`                                                   | Password hashing                    | Slow, memory-hard hashing so stolen hashes are very hard to crack                                              |
| `jsonwebtoken`                                             | JWT sign/verify                     | Short-lived access tokens that prove who the caller is                                                         |
| `cookie-parser`                                            | Cookie reader                       | Reads the httpOnly refresh-token cookie                                                                        |
| `helmet`                                                   | Security headers                    | One line that sets many protective HTTP headers                                                                |
| `cors`                                                     | Cross-origin rules                  | Lets only our React app (`CLIENT_URL`) call the API from a browser                                             |
| `express-rate-limit`                                       | Rate limiting                       | Slows brute-force and abuse (stricter on login)                                                                |
| `compression`                                              | gzip responses                      | Smaller responses, faster pages                                                                                |
| `multer`                                                   | Multipart upload parser             | Reads uploaded verification files (5 MB limit)                                                                 |
| `pino` + `pino-http`                                       | Logging                             | Fast structured JSON logs, plus one log line per request                                                       |
| `dotenv`                                                   | `.env` loader                       | Loads secrets and settings from `.env` into `process.env` (then validated by Zod)                              |
| `swagger-ui-express`                                       | API docs page                       | Serves the interactive docs at `/api/docs`                                                                     |
| `ioredis`                                                  | Redis client                        | Talks to Redis: the search cache, and the connection used by BullMQ                                            |
| `bullmq`                                                   | Job queue on Redis                  | Background jobs with retries (see below). Used for notifications                                               |
| `socket.io`                                                | Real-time (WebSocket) server        | Pushes live events to browsers (see below). Used for notifications                                             |

## Dev packages

| Package                                                      | Purpose                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| `typescript`, `tsx`                                          | Type checker/compiler, and `tsx` runs TS directly in dev      |
| `prisma`                                                     | CLI for migrations and generating the client                  |
| `vitest`, `@vitest/coverage-v8`, `supertest`                 | Test runner, coverage, and HTTP testing of the real Express app |
| `socket.io-client`                                           | Lets tests connect to our Socket.IO server like a browser would |
| `eslint`, `typescript-eslint`, `@eslint/js`, `globals`, `eslint-config-prettier` | Linting (finds bugs and bad patterns)  |
| `prettier`                                                   | Automatic formatting                                          |
| `husky`, `lint-staged`                                       | Git hook: format and lint staged files before every commit    |
| `pino-pretty`                                                | Human-readable logs in development                            |
| `@types/*`                                                   | TypeScript type definitions for libraries written in JS       |

---

## BullMQ: background jobs

**Problem:** some work should not make the user wait, and should not be lost if it fails (sending a notification, an email, generating a report).

**Idea:** a **queue** is a to-do list stored in Redis. One side adds jobs, another side does them.

```
API process (Producer)            Redis (the list)            Worker (Consumer)
  queue.add('REQUEST_RECEIVED', ───►  waiting ──► active ──►   runs the job function
            {userId, title...})        │              │            │
                                       │              └─ fail ──► retry later (backoff)
                                       └─ completed / failed (kept briefly for inspection)
```

Key words:

- **Queue**: the named list (`notifications`).
- **Job**: one item with a name and a JSON payload.
- **Producer**: code that adds jobs (our services call `notificationsService.notify`).
- **Worker**: code that takes jobs and runs a function. Concurrency 5 means five at a time.
- **Retries**: `attempts: 3` with exponential backoff (1 s, 2 s, ...) so a temporary DB hiccup does not lose the job.
- **Persistence**: jobs live in Redis, so they survive an API restart and can be processed by another process later.

Use cases in this project: notifications now; later email (verification, password reset), report generation, and scheduled clean-ups.

Design choices to mention in the viva:

- Producer and worker use **separate Redis connections**. Workers need `maxRetriesPerRequest: null`; the producer must fail fast when Redis is down.
- If adding to the queue fails, `notify()` **delivers inline** instead of losing the notification.
- `notify()` **never throws**: sending a request must succeed even if notifying fails.
- The worker runs inside the API process for simplicity. Because it only needs Redis and the database, it can later move to its own process without code changes.

## Socket.IO: real-time push

**Problem:** HTTP is request/response: the browser must ask. To show "Tutor accepted your request" instantly, the server must be able to push.

**Idea:** Socket.IO keeps a **WebSocket** connection open between browser and server (it falls back to polling when needed and reconnects automatically). Either side can send **events** at any time.

```
Browser                                  Server
  io(url, { auth: { token } }) ───────►  middleware: verify JWT   (bad token → connect_error 'Unauthorized')
                                          socket.join('user:<id>')   ← private room for this user
  ...connection stays open...
                                          emitToUser(id, 'notification', {...})
  socket.on('notification', cb) ◄──────  io.to('user:<id>').emit(...)
```

Key words:

- **Event**: a named message with a payload (we use one: `notification`).
- **Room**: a group of sockets. We make one room per user, so every tab and device of that user receives the event, and nobody else does.
- **Middleware (`io.use`)**: runs on connect; this is where we authenticate.
- Same HTTP server and port as the REST API.

Important: sockets only reach users who are **online right now**. That is why every notification is also **saved in PostgreSQL**: the bell icon loads `GET /notifications` on page load, and the live event just adds new ones on top.

## How the two fit together (the notification flow)

```
1. Student: POST /requests                       (HTTP, normal request)
2. requestsService.create() saves the request, then calls notify({userId: tutor, ...})
3. notify() → queue.add(...)   returns in ~1 ms, the student gets 201 immediately
4. Worker picks the job up from Redis
5. deliver(): INSERT into notifications (PostgreSQL)   ← never lost
6. deliver(): emitToUser(tutorId, 'notification', ...)  ← instant if the tutor is online
7. Tutor's browser: bell badge +1 (live), or GET /notifications later if offline
8. Tutor clicks it: POST /notifications/:id/read
```

Events that currently notify: request received / accepted / declined, new review, verification approved / rejected.

## Frontend usage (preview for later)

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', { auth: { token: accessToken } });
socket.on('notification', (n) => showToast(n.title) /* and bump the bell count */);
```

When the access token is refreshed, reconnect the socket with the new token.
