# EduConnect Sindh

[![Backend CI](https://github.com/muzamil-hussain-2004/EduConnectSindh/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/muzamil-hussain-2004/EduConnectSindh/actions/workflows/backend-ci.yml)
![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey)

**A smart tutor discovery, verification and online learning platform for Jamshoro, Sindh.**

Final Year Project 2026 · Department of Information Technology · University of Sindh, Jamshoro.

EduConnect Sindh connects students and parents with verified local tutors, and adds online courses, scheduled classes and an AI-assisted learning module. Jamshoro is the pilot city; the data model is built so Hyderabad and other cities can be added without code changes.

---

## Features

| Module                                                                      | Status     |
| --------------------------------------------------------------------------- | ---------- |
| Project foundation (config, logging, errors, security, DB, tests, docs, CI) | ✅ Done    |
| Authentication and role-based access (student, parent, tutor, admin)        | ✅ Done    |
| Tutor profiles, subjects and areas                                          | ✅ Done    |
| Admin-controlled tutor verification (documents stay private)                | ✅ Done    |
| Tutor search and filters (cached in Redis)                                  | ✅ Done    |
| Requests, shortlist, matching and recommendations                           | 🔜 Planned |
| Reviews and ratings with moderation                                         | 🔜 Planned |
| Notifications (real-time with Socket.IO)                                    | 🔜 Planned |
| Courses, lessons, enrollment, progress                                      | 🔜 Planned |
| Virtual class scheduling                                                    | 🔜 Planned |
| AI learning assistant                                                       | 🔜 Planned |
| Admin dashboard APIs                                                        | 🔜 Planned |

Detailed progress, with explanations of every step: **[PROGRESS.md](./PROGRESS.md)**.

## Tech stack

| Area                 | Technology                                                                |
| -------------------- | ------------------------------------------------------------------------- |
| Runtime and language | Node.js 20+, TypeScript (strict)                                          |
| API                  | Express 5, REST, OpenAPI/Swagger                                          |
| Database             | PostgreSQL 16 with Prisma ORM                                             |
| Cache, queues        | Redis 7 (BullMQ planned)                                                  |
| Auth                 | JWT access tokens, rotating refresh tokens, argon2 password hashing, RBAC |
| Validation           | Zod                                                                       |
| Security             | helmet, CORS, rate limiting                                               |
| Logging              | Pino                                                                      |
| Testing              | Vitest, Supertest                                                         |
| Quality              | ESLint, Prettier, Husky, lint-staged                                      |
| DevOps               | Docker Compose, GitHub Actions                                            |
| Frontend (planned)   | React, Tailwind CSS                                                       |

## Architecture

Every feature is a self-contained module, and every request flows the same way:

```
routes → middlewares (auth, validation, rate limit) → controller → service → repository → PostgreSQL / Redis
```

- **Controller:** reads the request and sends the response. No business logic.
- **Service:** business rules.
- **Repository:** the only layer that talks to the database.

Errors are thrown as `AppError` and one global handler returns a consistent JSON shape:

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Tutor not found" }
}
```

## Project structure

```
EduConnectSindh/
├─ backend/
│  ├─ src/
│  │  ├─ app.ts, server.ts      # Express app / process startup
│  │  ├─ config/                # env (Zod), logger, database, swagger
│  │  ├─ middlewares/           # auth, validation, errors, rate limiting
│  │  ├─ modules/               # features: auth, users, tutors, ... (routes/controller/service/repository)
│  │  ├─ shared/                # AppError, utils, constants, types
│  │  ├─ integrations/          # AI, maps, mail, storage wrappers
│  │  ├─ jobs/, sockets/        # background workers, real-time
│  │  └─ database/              # Prisma schema, migrations, seeds
│  ├─ tests/                    # unit/, integration/, e2e/
│  └─ docker-compose.yml        # PostgreSQL + Redis
├─ .github/workflows/           # CI
├─ PROGRESS.md                  # build guide and tracker
└─ README.md
```

## Getting started

### Prerequisites

- Node.js 20 or newer
- Docker Desktop (for PostgreSQL and Redis)
- Git

### Setup

```bash
git clone https://github.com/muzamil-hussain-2004/EduConnectSindh.git
cd EduConnectSindh/backend

npm install
cp .env.example .env          # Windows: copy .env.example .env
# edit .env: set strong JWT secrets (see comments inside the file)

npm run docker:up             # start PostgreSQL (port 5433) and Redis (6379)
npm run db:migrate            # create the tables
npm run db:seed               # starter data: Jamshoro, areas, subjects, admin user
npm run dev                   # API on http://localhost:5000
```

### Useful URLs

| URL                            | What                              |
| ------------------------------ | --------------------------------- |
| http://localhost:5000/health   | Health check (API and database)   |
| http://localhost:5000/api/docs | Interactive Swagger documentation |

## Scripts (run inside `backend/`)

| Command                               | Purpose                              |
| ------------------------------------- | ------------------------------------ |
| `npm run dev`                         | Start with auto-reload               |
| `npm run build` / `npm start`         | Compile and run production build     |
| `npm test`                            | Run all tests (needs Docker running) |
| `npm run test:coverage`               | Tests with coverage report           |
| `npm run lint` / `npm run format`     | ESLint / Prettier                    |
| `npm run typecheck`                   | TypeScript check without output      |
| `npm run db:migrate -- --name <name>` | Create and apply a migration         |
| `npm run db:seed`                     | Insert starter data (safe to repeat) |
| `npm run db:studio`                   | Browse data in the browser           |
| `npm run docker:up` / `docker:down`   | Start / stop PostgreSQL and Redis    |

## API overview

Base path: `/api/v1`. Full interactive reference at `/api/docs`.

| Method | Path                                 | Description                                             | Auth          |
| ------ | ------------------------------------ | ------------------------------------------------------- | ------------- |
| POST   | `/auth/register`                     | Create a student, parent or tutor account               | Public        |
| POST   | `/auth/login`                        | Log in, receive an access token and refresh cookie      | Public        |
| POST   | `/auth/refresh`                      | Rotate the refresh token, get a new access token        | Cookie        |
| POST   | `/auth/logout`                       | Revoke the refresh token                                | Cookie        |
| PATCH  | `/users/me`                          | Update my name / phone                                  | Bearer token  |
| POST   | `/users/me/password`                 | Change password (logs out all devices)                  | Bearer token  |
| GET    | `/users`                             | List users (pagination, role/status/search filters)     | Admin         |
| PATCH  | `/users/:id/status`                  | Suspend or reactivate a user                            | Admin         |
| GET    | `/tutors/me`                         | My tutor profile                                        | Tutor         |
| PUT    | `/tutors/me`                         | Create or replace my tutor profile                      | Tutor         |
| GET    | `/tutors`                            | Search tutors (filters, sort, pagination, Redis cached) | Public        |
| GET    | `/tutors/:id`                        | Public tutor profile (published only)                   | Public        |
| GET    | `/catalog/cities`                    | Cities with their areas                                 | Public        |
| GET    | `/catalog/subjects`                  | All subjects                                            | Public        |
| GET    | `/verification/me`                   | My verification status and documents                    | Tutor         |
| POST   | `/verification/documents`            | Upload a CNIC/degree file (JPG, PNG, PDF, max 5 MB)     | Tutor         |
| DELETE | `/verification/documents/:id`        | Delete my document                                      | Tutor         |
| POST   | `/verification/submit`               | Submit documents for review                             | Tutor         |
| GET    | `/verification/documents/:id/file`   | Download a document                                     | Owner / Admin |
| GET    | `/verification/requests`             | List requests (filter by status)                        | Admin         |
| GET    | `/verification/requests/:id`         | Request details with documents                          | Admin         |
| POST   | `/verification/requests/:id/approve` | Approve (tutor becomes VERIFIED)                        | Admin         |
| POST   | `/verification/requests/:id/reject`  | Reject with a reason                                    | Admin         |
| GET    | `/auth/me`                           | Current user                                            | Bearer token  |

## Security highlights

- Passwords hashed with **argon2id**; never stored or logged in plain text.
- Short-lived **JWT access tokens** (15 min). **Refresh tokens** are random, stored only as an HMAC hash, delivered in an `httpOnly` cookie, rotated on every use, with reuse detection.
- Login, register and refresh are rate limited; login answers are identical for unknown email and wrong password.
- Strict env validation: the app refuses to start with weak or missing secrets.
- Identity documents (planned) are stored privately and never exposed publicly.

## Workflow and conventions

- Branches: `main` is always working. Larger features may use `feat/<module>` branches.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(auth): add login`, `fix: ...`, `docs: ...`, `test: ...`.
- A pre-commit hook formats and lints staged files. CI runs format check, lint, typecheck, tests and build on every push.
- Every new endpoint ships with tests and an OpenAPI entry.

## Team

| Name                   | Roll No.    | Role                  |
| ---------------------- | ----------- | --------------------- |
| Muzamil Hussain Burfat | 2k23/IT/116 | Project Lead, backend |

Supervisor: Prof. Muhammad Ali Nizamani.

## License

Academic project, all rights reserved (UNLICENSED).
