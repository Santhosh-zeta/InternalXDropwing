# Getting started (new team member)

This guide takes you from a fresh `git clone` to a running InternalX on your laptop, then shows you
how the code is organised and the rules you must follow when changing it.

Everything here was run on a fresh clone of `main`. If a step does not work for you, that is a bug in this
document: please fix it in the same pull request as whatever you were doing.

## 1. What you are running

InternalX is the internal management platform for Dropwing Groups' four ventures (Dropwing Design Studio, Fenixa
Solutions, PerSyniX, Grovia) plus external clients.

| Part | Where | Tech |
| :-- | :-- | :-- |
| API + realtime chat | `backend/` | Node 20, Express, PostgreSQL 16, Socket.IO |
| Web app | `frontend/` | Next.js 16 (static export), React 19, Tailwind 4 |
| Mobile app | `mobile/` | Flutter 3 |

In development and production the API serves the built web app, so there is **one origin and one port**
(`http://localhost:5000`). You normally do not run the frontend separately.

## 2. Prerequisites

- **Node.js 20+** and npm.
- **A PostgreSQL 16 database**, either:
  - **Docker** (easiest): the setup script starts a throwaway Postgres for you, or
  - an existing Postgres you can reach (set the `DB_*` variables, see below).
- **bash**. macOS and Linux have it. On Windows use **WSL** or Git Bash.
- Flutter 3 only if you work on the mobile app.

## 3. Start the server (about 5 minutes)

```bash
git clone https://github.com/Santhosh-zeta/InternalXDropwing.git
cd InternalXDropwing
./scripts/dev.sh --demo
```

That one command is safe to re-run (it never overwrites your config or data). It:

1. starts Postgres from `docker-compose.dev.yml` (or uses your `DB_*` settings if Docker is not available),
2. creates `backend/.env` with a freshly generated `JWT_SECRET`,
3. installs dependencies and applies the database migrations,
4. creates a **dev Super Admin** and prints the email and password **once**: copy them from the terminal,
5. with `--demo`: loads 4 ventures, a user at every level, projects, tasks and timesheets,
6. builds the web app and starts everything on **http://localhost:5000**.

Without Docker, point it at your own database first:

```bash
DB_HOST=localhost DB_PORT=5432 DB_NAME=internalx DB_USER=myuser DB_PASSWORD=mypassword ./scripts/dev.sh --demo
```

Other options: `--no-start` (set up only, then `cd backend && npm start`), `--rebuild` (rebuild the web app after
frontend changes), `PORT=5400 ./scripts/dev.sh` (another port). `npm run dev` / `npm run dev:demo` at the repo
root do the same thing.

### Sign in

Sign-in is **password + a one-time code**. With no email server configured, the code is printed in the terminal
where the server runs:

```
OTP for admin@internalx.local: 123456
```

Use the dev Super Admin printed at setup, or a demo user: `<key>@demo.internalx.test`, for example

| Email | Who they are |
| :-- | :-- |
| `l1@demo.internalx.test` | Super Admin (sees everything) |
| `dd.l5@demo.internalx.test` | Manager in Dropwing Design Studio (venture `dd`, level 5) |
| `fx.l7@demo.internalx.test` | Staff in Fenixa |
| `dd.client@demo.internalx.test` | External client of Dropwing |

The demo password is printed once by `--demo` (or set `DEMO_PASSWORD=...` yourself). Log in as different people in
different browser profiles to see how access changes: that is the heart of this product (section 5).

Sign-in allows 8 attempts per account per 15 minutes. If you lock yourself out, wait or restart the server.

### Check your setup

Open **Settings > System** (Super Admin / Managing Director only) or read the `[selfcheck]` block the server prints
at boot. It lists what is configured and what is missing, with a one-line fix for each. In development the optional
items (email, AI, Google sign-in, scheduler) are normally "warning", which is fine.

## 4. Everyday commands

| Task | Command |
| :-- | :-- |
| Run the API with auto-reload | `cd backend && npm run dev` |
| Backend tests | see below |
| Frontend type-check, lint, build | `cd frontend && npx tsc --noEmit && npm run lint && npm run build` |
| Rebuild the web app into the API | `./scripts/dev.sh --rebuild --no-start` |
| Hot-reload frontend work | `cd frontend && npm run dev` (port 3000) with `NEXT_PUBLIC_API_URL=http://localhost:5000` in `frontend/.env.local` and `CORS_ORIGINS=http://localhost:3000` in `backend/.env` |
| Create another admin | `cd backend && npm run create-admin -- --email you@dropwinggroups.com --level 2` |
| Load demo data into any dev DB | `cd backend && npm run seed:demo` |
| Get a session token for `curl` | `cd backend && node scripts/dev-token.js dd.l5` |
| Apply migrations by hand | `cd backend && npm run migrate` (the server also does this at boot) |
| Browser smoke test | `npm run e2e` (see the README for the one-time Playwright install) |

**Backend tests use a disposable database.** The suite drops and recreates its `public` schema, so never point it at
real data:

```bash
createdb internalx_test
cd backend
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/internalx_test npm test
```

Expect all suites to pass. CI runs the same tests plus frontend type-check, lint (must be 0 errors) and build.

## 5. The one rule: who may see what

Every query that touches business data must go through **`backend/src/utils/scope.js`**. It reads the caller's level,
venture and project memberships from the database on every request and produces the SQL conditions:

| Level | Role | Sees |
| :-- | :-- | :-- |
| 1, 2 | Super Admin, Managing Director | all ventures |
| 3, 4, 5 | Admin, CXO, Manager | their own venture |
| 6, 7, 8 | Executive, Staff, Intern | their own projects and tasks |
| 9 | Client | only their projects, client-safe data only |

Do not take a `ventureId` or `userId` from a request and trust it. Derive access from `req.scope`. The full
rules are in [data-isolation.md](data-isolation.md), and `backend/tests/idor.test.js` is an access matrix that must keep
passing: if you add an endpoint that returns business data, add it to the matrix.

People are created by **invitation** only (an admin creates the user and the system emails a set-password link; with no
email server the admin sees the link once). There are no seeded passwords anywhere in the repository.

## 6. Where things live

```
backend/src/server.js          startup, middleware, route mounting
backend/src/routes/            one file per module (tasks, projects, invoices, chat, ...)
backend/src/controllers/       heavier handlers
backend/src/services/          chat, audit, sessions, email, notifications, digest, alerts, search, assistant/, ai/
backend/src/utils/scope.js     THE access layer (section 5)
backend/src/utils/canManageUser.js   who may create/edit/delete which users
backend/src/config/selfcheck.js      the startup + Settings > System report
backend/migrations/            numbered SQL migrations (0001 ... ), applied at boot
backend/tests/                 Jest + Supertest suites (one per area)
frontend/src/app/dashboard/    the app: menu.tsx declares every view, one *View.tsx per screen
frontend/src/lib/              api client and types
deployment/                    production database init, backups, tunnel config
docs/                          you are here
```

### Common changes

- **Change the database:** add a new file `backend/migrations/00NN_description.sql` (next free number, idempotent SQL, never edit an
  applied file: checksums are enforced) **and** make the same change in `deployment/postgres/init/01_schema.sql`.
  A test fails if the two disagree.
- **Add an API endpoint:** add the route, check access with `scope.js`, validate input, write an audit entry for
  changes (`services/audit.service.js`), add tests including the cross-venture case.
- **Add a screen:** create `frontend/src/app/dashboard/YourView.tsx`, register it in `menu.tsx` with the levels that
  may see it (mirror the backend rules), fetch data with the `useApi` hook.
- **Add an environment variable:** read it in the backend, then document it in `backend/.env.example` (a test fails
  if you forget).

## 7. Configuration you will meet

All backend settings are environment variables, listed with comments in `backend/.env.example` (the first run copies
it to `backend/.env`, which is git-ignored). The ones that matter:

| Variable | What it does |
| :-- | :-- |
| `JWT_SECRET` | Signs sessions. Generated for you in dev. Required and strong in production |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | PostgreSQL connection |
| `FRONTEND_URL` | Public URL of the app (CORS, links in emails) |
| `BOOTSTRAP_ADMIN_EMAIL` `BOOTSTRAP_ADMIN_PASSWORD` | Creates the first Super Admin on first boot (production) |
| `SMTP_*` | Email: sign-in codes, invites, resets, digests. Required in production |
| `ANTHROPIC_API_KEY` **or** `OPENAI_API_KEY` **or** `GEMINI_API_KEY` | Any one enables the Ask InternalX assistant ([ai-features.md](ai-features.md)) |
| `GOOGLE_CLIENT_ID` | Optional "Continue with Google" for existing users |
| `ENABLE_SCHEDULER` `APP_TIMEZONE` | Monday digest and daily alerts (on by default in production) |

Never commit secrets: this repository is public. `.env` files are ignored, CI scans for credential-shaped strings.

## 8. Troubleshooting

| Symptom | Fix |
| :-- | :-- |
| `ECONNREFUSED 127.0.0.1:5432` | Postgres is not running. `docker compose -f docker-compose.dev.yml up -d`, or start your local Postgres |
| Setup says Node is too old | Install Node 20 or newer |
| "Too many attempts" at sign-in | 8 tries per account per 15 min. Wait, or restart the dev server |
| No sign-in code arrives | Dev has no email: read `OTP for <email>: ...` in the server terminal |
| Page is blank / "Frontend is currently building" | Run `./scripts/dev.sh --rebuild --no-start`, then restart the server |
| A migration fails at boot | Read the `[migrate]` line. Do not edit an applied migration; add a new one |
| Tests fail with database errors | `TEST_DATABASE_URL` must point to a disposable, empty database |
| Port 5000 busy | `PORT=5400 ./scripts/dev.sh` |
| Assistant says "not configured" | Expected until you add an AI key (section 7) |

## 9. Going to production

Do not use `dev.sh` for production. Follow [production-checklist.md](production-checklist.md): environment variables,
the Docker image and compose stack, first boot and Super Admin creation, backups and restore, upgrades.

## 10. Reading list

1. [README.md](../README.md): product overview, access model, API overview
2. [data-isolation.md](data-isolation.md): the access rules in full
3. [ai-features.md](ai-features.md): what the assistant can and can never do
4. [production-checklist.md](production-checklist.md): deploying and operating
5. [HANDOFF.md](HANDOFF.md): current status, known limitations, roadmap
6. [../CONTRIBUTING.md](../CONTRIBUTING.md) and [../SECURITY.md](../SECURITY.md)
