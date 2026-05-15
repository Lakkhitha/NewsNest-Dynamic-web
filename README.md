# NewsNest — Dynamic Newsroom

## Executive summary

NewsNest is a full-stack, single-repository news application designed as a final-year project. It demonstrates an editorial publishing workflow with features useful for prototyping newsrooms: moderated submissions, role-based access control, personalized "For You" feeds, breaking/emergency alerts, trust scoring, and optional ingestion from third-party news providers (NewsAPI.org).

This README documents architecture, setup, runtime commands, key implementation details, database schema highlights, API contract, operational notes, and pointers for development and deployment.

## Goals and scope

- Provide a clean, responsive editorial UI that emphasizes design and readability.
- Implement backend moderation and RBAC so a small editorial team can review, approve, and publish user submissions.
- Offer personalization via per-user category preferences.
- Demonstrate integration with third-party news sources (NewsAPI) while keeping imported content clearly tagged.
- Keep the stack simple and portable: Node + Express + SQLite for the server, React + Vite for the client.

---

## Tech stack

- Frontend: React (Vite) + TypeScript, React Router v7, Context-based client state.
- Backend: Node.js + Express 5 + TypeScript.
- Database: SQLite via `better-sqlite3` (file-backed DB at `server/data/newsnest.sqlite`).
- Auth: JWT for session tokens; Google Sign-in via server-side ID token verification.
- External integration: NewsAPI.org importer (optional).

---

## Repo layout (high level)

- `client/` — React app
  - `client/src/components/Layout.tsx` — main app shell (header, ticker, alerts, footer)
  - `client/src/pages/HomePage.tsx` — home page with hero, latest, trending, forYou
  - `client/src/pages/*` — other pages: `ArticlePage`, `DashboardPage`, `AuthPage` etc.
  - `client/src/api.ts` — client-side API wrappers
  - `client/public/logo.png` — branding asset (served by Vite)
- `server/` — Express API and DB
  - `server/src/index.ts` — API routes, auth middleware, import endpoint
  - `server/src/db.ts` — database initialization and idempotent migration helpers
  - `server/src/seed.ts` — demo seed data (idempotent)
  - `server/src/newsapi.ts` — NewsAPI import helper
  - `server/src/auth.ts` — JWT helpers, password hashing, Google validation

---

## Environment variables

Recommended (development): set these in your shell before running the app.

- `PORT` — server port (default: `4000`).
- `JWT_SECRET` — secret used to sign JWTs. Change for production. Defaults to `newsnest-dev-secret` in dev.
- `NEWSAPI_KEY` — optional: API key for NewsAPI.org; when set the server attempts one import on start.
- `GOOGLE_CLIENT_ID` or `VITE_GOOGLE_CLIENT_ID` — configure to enable Google Sign-in.

Security: Do not commit secrets. Use OS environment variables, `.env` with gitignored files, or secure CI settings.

---

## Installing & running (development)

1. Install dependencies from repository root:

```bash
npm install
```

2. Run development servers (client + server concurrently):

```bash
npm run dev
# client: http://localhost:5173
# server: http://localhost:4000
```

3. Visit the client at `http://localhost:5173`.

Notes:
- The server uses `tsx` for `npm run dev --workspace server` so TypeScript changes reload quickly.

---

## Building & running production (local)

```bash
# Build client and server
npm run build

# Start server which serves the built client
npm run start
# Server default: http://localhost:4000
```

To run a NewsAPI import automatically on start (one-time):

```bash
# powershell
$env:NEWSAPI_KEY='your_key_here'
npm run start --workspace server

# linux/mac
NEWSAPI_KEY=your_key_here npm run start --workspace server
```

---

## Database & seeding overview

- File: `server/src/db.ts` — ensures tables exist and applies idempotent column additions.
- File: `server/src/seed.ts` — inserts demo users (super admin, editor, writers), categories, tags, and sample articles using `INSERT OR IGNORE` and `ON CONFLICT` upserts.
- DB file: `server/data/newsnest.sqlite` is created automatically on first run.

Seeding behavior:
- Safe to re-run; seed uses `ON CONFLICT` and explicit `DELETE`/`INSERT OR IGNORE` in places where duplicates could occur.

---

## Authentication & roles

- JWT tokens are signed with the `JWT_SECRET` and include `{ id, name, email, role }`.
- Middleware `authRequired` enforces authentication on protected routes by verifying `Authorization: Bearer <token>`.
- Roles supported: `super_admin`, `admin`, `editor`, `writer`.
- `isSuperAdmin` helper gates super-admin-only actions (user management, some admin-only endpoints).

Google sign-in:
- The server verifies Google ID tokens server-side via `google-auth-library`. Configure `GOOGLE_CLIENT_ID`.

---

## API surface (detailed)

Public endpoints (no auth required):

- `GET /api/health` — health check JSON.
- `GET /api/home` — returns full home payload:
  - `hero` — single lead article
  - `featured` — array of featured articles (max 4)
  - `latest` — recent articles
  - `trending` — top trending articles
  - `breaking` — breaking stories
  - `categories` — all categories
  - `forYou` — personalization results (if user preferences provided)
  - `alerts` — active alert-level stories

- `GET /api/articles` — queryable list (query params: `q`, `category`, `categories`)
- `GET /api/articles/:slug` — article detail; also increments views/trendingScore.

Auth endpoints:

- `POST /api/auth/register` — create an account (name,email,password); response includes JWT.
- `POST /api/auth/login` — email/password login -> issues JWT.
- `POST /api/auth/google` — accept Google ID token, create or update user, return JWT.
- `GET /api/auth/me` — returns user profile (requires auth header).

Admin / user endpoints (examples):

- `PUT /api/me/preferences` — set category preferences for personalization (auth required).
- `POST /api/import/newsapi` — trigger import from NewsAPI (accepts `apiKey` in body or uses `NEWSAPI_KEY` env).
- `GET /api/categories/:slug` — get articles for a category.
- Dashboard endpoints for moderation exist under `/api/dashboard` (role-sensitive).

---

## NewsAPI import behavior

- Implemented at `server/src/newsapi.ts` and exposed via `POST /api/import/newsapi`.
- Fetches `top-headlines` (English) and inserts each article into the database using an idempotent upsert (slug-based).
- Imported articles receive a `newsapi` tag and are attributed to the internal `NewsNest News Bot` account.
- Importing is intentionally manual (POST) to avoid accidental quota usage, but the app supports one automatic import on server start when `NEWSAPI_KEY` is set.

Rate limits & notes:
- NewsAPI has rate limits and requires a valid API key; the importer is simple and intended for demo purposes only.
- Add deduplication filters or stricter source/keyword rules for production ingestion.

---

## Frontend notes

- Client code is in `client/src/` with typed models in `client/src/types.ts`.
- UI components:
  - `Layout.tsx` — header, ticker, alert ribbon, footer
  - `ArticleCard.tsx` — article presentation used throughout
  - `HomePage.tsx` — constructs the home layout using server payload
- Styling: `client/src/styles.css` — CSS variables for theming, responsive grid, featured styles.

UX considerations made:
- Defensive coding: many feed arrays from the server are guarded with `?? []` to avoid hydration/runtime crashes.
- Theme toggle (light/dark) with CSS variables.

---

## Testing / verification

- Manual smoke tests performed across 10+ routes: home, article, category, search, auth, dashboard, submit.
- Use `GET /api/home` to quickly inspect server payloads when debugging rendering issues.

Automated tests:
- None included; recommended next step is to add a small test suite (Jest + React Testing Library for client, Supertest for server).

---

## Troubleshooting

- `better-sqlite3` typing: if TypeScript complains, ensure `server/src/better-sqlite3.d.ts` exists (helper added) or install types if available.
- If the server fails to start due to port conflicts, check processes using port `4000` and stop them.
- If NewsAPI import fails, check `NEWSAPI_KEY` validity and NewsAPI quota.

---

## Design decisions & trade-offs

- SQLite was chosen for portability and simplicity (works well for demos and local testing).
- A monorepo with npm workspaces keeps client and server aligned; `npm run dev` runs both concurrently for developer convenience.
- The importer uses a plain upsert/slug approach; production ingestion would require deduplication, canonicalization, and rate handling.

---

## Future improvements (suggestions)

- Add scheduled ingestion (cron) that respects rate limits and provides deduplication.
- Add automated tests and CI to run type checks + build on PRs.
- Add end-to-end tests (Cypress/Playwright) for critical flows (publish, login, personalization).
- Improve RBAC UI for granular role assignment and permissions management.

---

## File map (quick links)

- `client/src/components/Layout.tsx` — header & footer (branding) 
- `client/src/pages/HomePage.tsx` — home layout and feed assembly
- `client/src/components/ArticleCard.tsx` — article card UI
- `client/src/api.ts` — client API wrappers
- `client/src/styles.css` — central styling system
- `server/src/index.ts` — express app, routes, auth middleware, import endpoint
- `server/src/db.ts` — migrations and schema creation
- `server/src/seed.ts` — idempotent demo data
- `server/src/newsapi.ts` — NewsAPI ingestion helper
- `server/src/auth.ts` — jwt & google helpers

---

## Contact & credits

- Developer: Lakkhitha Kariyawasam
- Location: Colombo, Sri Lanka
- Workspace: `D:\Assignment\Lakkitha\New2`

If you'd like, I can:

- Commit these changes to a local branch and create a patch.
- Add an admin dashboard button to trigger `POST /api/import/newsapi` from the UI.
- Generate a short slide deck summarizing the project for submission.

---

## License

This repository is provided for academic and demonstration purposes. Add your preferred license before publishing.

