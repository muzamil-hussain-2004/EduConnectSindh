# Frontend guide (React + Redux Toolkit + Tailwind)

This explains how the frontend is organised, how data flows, and what each library is for.

## 1. Folder structure (feature-based)

```
frontend/src
├── app/            store, typed hooks, router, AuthBootstrap (app wiring)
├── config/         env.ts  (reads VITE_* variables once)
├── lib/            cn.ts   (class-name helper)
├── services/api/   baseApi.ts (RTK Query base: token header, 401 re-auth)
├── features/auth/  everything about auth: slice, api, schemas, forms, tests
├── components/ui/  dumb reusable pieces (Button, Input, Card, Spinner)
├── components/layout/  AppLayout (navbar/footer), RouteGuards
├── pages/          one file per route; thin, they compose features
└── types/          shared TypeScript types matching the backend contract
```

Rule: **a feature folder owns its logic**; `pages/` only assemble; `components/ui` knows nothing about the API.
New features (tutors, requests, notifications) get their own `features/<name>/` folder.

## 2. The big picture: how a login works

```
LoginForm (React Hook Form + Zod validate in browser)
   └─ useLoginMutation()  (RTK Query)  ──►  baseQuery adds headers, sends POST /api/v1/auth/login
                                               │  (Vite dev proxy forwards to backend :5000)
   backend returns {user, accessToken} + sets httpOnly refresh cookie
   └─ onQueryStarted → dispatch(credentialsSet(...))  → Redux auth slice = authenticated
   └─ navigate('/dashboard')  → ProtectedRoute sees user → renders page
```

## 3. Where is the token kept? (security)

- **Access token (15 min):** only in Redux memory. Never `localStorage`, because any injected script could steal it.
- **Refresh token (7 days):** httpOnly cookie set by the backend. JavaScript cannot read it.
- **Page reload:** memory is wiped, so `AuthBootstrap` calls `/auth/refresh` (cookie is sent automatically) and gets a fresh access token. While waiting, status is `loading` and guards show a spinner so you never flash the login page.
- **Token expires mid-use:** `baseApi` gets a 401, calls refresh once, stores the new token and **retries the original request**. The user notices nothing.
- **Single-flight refresh:** the backend rotates refresh tokens and treats reuse as theft (revokes everything). If two refreshes ran at once (React StrictMode runs effects twice in dev; or two requests 401 together) one would look like theft. `refreshSession()` therefore shares one in-flight promise.

## 4. Libraries and why

| Library                    | What it is                         | Why we use it                                                                                    |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| Vite                       | Dev server and bundler             | Instant startup, hot reload, also proxies `/api` and `/socket.io` to the backend (no CORS pain). |
| React 19 + TypeScript      | UI + types                         | Strict mode (`noUncheckedIndexedAccess`) catches bugs early.                                     |
| Redux Toolkit              | Global state (the auth slice)      | Predictable state; `createSlice` removes boilerplate.                                            |
| RTK Query                  | Data fetching and caching          | Generates hooks (`useLoginMutation`), caches responses, loading/error states for free.           |
| React Router 8             | Routing                            | Nested routes + guards (`ProtectedRoute`, `GuestRoute`).                                         |
| React Hook Form + Zod      | Forms and validation               | Fast forms; the Zod schema mirrors backend rules; server `details` are mapped onto fields.       |
| Tailwind CSS 4             | Utility-first styling              | Consistent design with brand tokens in `index.css` (`@theme`).                                   |
| clsx + tailwind-merge      | `cn()` helper                      | Conditional classes, and later classes override earlier ones correctly.                          |
| lucide-react               | Icons                              | Tree-shaken SVG icons.                                                                           |
| sonner                     | Toasts                             | Success and error messages.                                                                      |
| socket.io-client           | Live notifications (next step)     | Pairs with the backend Socket.IO server.                                                         |
| Vitest + Testing Library   | Tests                              | Test what users see (headings, errors, redirects) in jsdom.                                      |
| Prettier (+ tailwind plug) | Formatting, sorts Tailwind classes | Same style everywhere, enforced by CI.                                                           |
| oxlint                     | Linter                             | Very fast Rust linter.                                                                           |

## 5. Route guards

- `ProtectedRoute` (optionally `roles={['ADMIN']}`): spinner while `idle/loading`, redirect to `/login` if no user (remembers the page in `state.from`), redirect to `/dashboard` if the role is wrong.
- `GuestRoute`: logged-in users are sent away from `/login` and `/register`.
- The UI guard is a **convenience only**; real security is the backend (JWT + RBAC on every endpoint).

## 6. Commands (inside `frontend/`)

`npm run dev` (port 5173), `build`, `test`, `typecheck`, `lint`, `format`. The backend must run on port 5000.

## 7. Next frontend steps

F2 tutor search and profile pages; F3 requests, shortlist and the notification bell (Socket.IO); F4 tutor dashboard and verification upload; F5 admin screens.
