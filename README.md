<div align="center">

<img src="docs/images/banner.png" alt="Dropwing Groups Engineering" width="100%" />

# InternalX

**One internal operating system for a multi-venture company: web, mobile and API.**

Four separate ventures, nine access levels, one login. People only ever see what their venture and
project membership entitles them to; the Managing Director sees everything.

[What it does](#what-it-does) · [Access model](#access-model) · [Accounts and invites](#accounts-and-invites) · [Quick start](#quick-start) · [Configuration](#configuration) · [Production](#production) · [API](#api-overview) · [Security](#security)

[![CI](https://github.com/Santhosh-zeta/InternalXDropwing/actions/workflows/ci.yml/badge.svg)](https://github.com/Santhosh-zeta/InternalXDropwing/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-5FA04E?style=flat-square&logo=nodedotjs)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![Flutter](https://img.shields.io/badge/Flutter-3-02569B?style=flat-square&logo=flutter)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

</div>

---

## What it does

**Dropwing Groups** runs four ventures: Dropwing Design Studio, Fenixa Solutions, PerSyniX and
Grovia. InternalX gives them one database, one identity and one audit trail, with strict isolation
between ventures and between internal staff and external clients.

| Domain | Modules |
| :-- | :-- |
| Operations | Projects (members, milestones), Tasks, Timesheets with approval, Documents (per-project, optionally client-visible) |
| Finance | Invoices, Budget, Reports (costs come from one rate source: project rate, else user hourly rate; no rate means no invented cost) |
| Strategy | OKRs and key results, strategic risks, department KPIs |
| People | User Management (invite, approve, change level/venture within your rank), Learning Hub for interns |
| Collaboration | Team Chat (venture rooms, global room, direct messages), Notifications, Approvals, Calendar |
| Clients (L9) | A restricted portal: their projects, client-visible documents and deliverables, their invoices |
| Governance | Audit log of privileged actions |

The web app is a Next.js 16 static export served by the API (one origin, one container). The
Flutter app in `mobile/` talks to the same REST + Socket.IO API.

## Access model

Nine levels, lower number = more power. The single source of truth is `backend/src/utils/scope.js`
(see [docs/data-isolation.md](docs/data-isolation.md) for the full rules and the test matrix).

| Level | Role | Sees |
| :-: | :-- | :-- |
| 1 | Super Admin | Every venture, every row |
| 2 | Managing Director | Every venture, every row |
| 3 | Admin | Own venture, all of its data; manages users below them in that venture |
| 4, 5 | CXO, Manager | Own venture, all of its data (L5 approves timesheets) |
| 6, 7, 8 | Executive Staff, Staff, Intern | Own venture, but only projects they are members of, tasks assigned to or created by them, their own timesheets |
| 9 | Client | Only projects they belong to and client-safe data: no internal chat, no staff, no other people's timesheets or finance |

- The scope is re-read from the database on every request, so a demotion or deactivation applies
  immediately. Ids in request bodies or queries never grant access.
- Nobody can create, edit, promote or delete a user at or above their own level (L1 may manage
  everyone except demoting the last Super Admin). Venture and level changes of others are for L1/L2;
  an L3 admin manages levels 4-9 in their own venture only.
- Staff (L6-L8) get a team directory of their own venture plus the global leadership; never clients
  or other ventures' people.
- Real-time chat rooms are assigned and validated by the server against the same scope.

## Accounts and invites

InternalX is **invite-only by default**; there is no open sign-up and no shipped account.

1. **First admin.** Set `BOOTSTRAP_ADMIN_EMAIL` and a strong `BOOTSTRAP_ADMIN_PASSWORD` for the first
   boot (created only while no Super Admin exists; remove the password afterwards), or run
   `npm run create-admin` in `backend/`.
2. **Invite.** User Management > Invite creates the user and emails a one-time set-password link valid
   for 72 hours. No temporary password is ever shown. If SMTP is not configured the API returns the
   link once to the inviting admin (it is never logged). `POST /api/team-members/:id/invite` re-issues
   it for someone who has not signed in yet.
3. **Sign in** with email + password, then a one-time code sent by email (or Google sign-in for
   accounts that already exist). Passwords can be reset by email.
4. **Optional self-registration:** `ALLOW_SELF_REGISTRATION=true` lets people request an account at
   `/register`. It is created inactive and pending, with no venture, and an L1/L2 admin approves it
   (`GET /api/team-members?pending=true`, then `PUT` with `is_active` and a venture). `GET /api/auth/config`
   tells the web app which mode is on.

## Quick start

> New to the team? Read **[docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)**: it walks you from `git clone` to a running server, explains the access rules, and lists the everyday commands and troubleshooting.

Prerequisites: Node.js 20+, and either Docker (it starts PostgreSQL for you) or a PostgreSQL 16 you can
reach. Flutter 3 only for the mobile app.

```bash
git clone https://github.com/Santhosh-zeta/InternalXDropwing.git && cd InternalXDropwing
./scripts/dev.sh --demo        # or: npm run dev:demo
```

That one command (idempotent, safe to re-run, refuses to run with `NODE_ENV=production`):

1. starts PostgreSQL from `docker-compose.dev.yml` (no Docker: it uses `DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD`
   from your environment),
2. creates `backend/.env` from `.env.example` with a freshly generated `JWT_SECRET` (never overwritten),
3. installs dependencies and applies the database migrations,
4. creates a **dev Super Admin** and prints its email and random password once (skipped if one exists),
5. with `--demo`: loads 4 ventures, a user per level, projects, tasks and timesheets (`<key>@demo.internalx.test`,
   e.g. `l1`, `dd.l5`, `dd.client`; password from `DEMO_PASSWORD` or random, printed once),
6. builds the web app into `backend/public/frontend-build` and serves everything on **http://localhost:5000**
   (`PORT=5400 ./scripts/dev.sh` for another port; `--rebuild` after frontend changes).

Sign-in is password + a one-time code. Without SMTP the code is printed in the server terminal as
`OTP for <email>: 123456` (development only). Check what is configured under **Settings > System**.

Manual equivalent: `docker compose -f docker-compose.dev.yml up -d`, then in `backend/`
`cp .env.example .env` (set `JWT_SECRET`, `DB_*`, optionally `BOOTSTRAP_ADMIN_*`) and `npm ci && npm run dev`.
The web app: `cd frontend && npm ci && npm run build`, then copy `out/` to `backend/public/frontend-build`; for hot reload
use `npm run dev` on :3000 with `NEXT_PUBLIC_API_URL=http://localhost:5000` and `CORS_ORIGINS=http://localhost:3000`.
Demo data and a session token for curl: `node scripts/seed-demo.js`, `node scripts/dev-token.js dd.l5` (both refuse to
run in production).

**Tests.** Jest + Supertest against a disposable database (the suite drops and recreates its `public`
schema, so never point it at real data):

```bash
createdb internalx_test
cd backend && TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/internalx_test npm test
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

**End-to-end smoke test** (real browser, real build, demo data). Start the app with
`DEMO_PASSWORD=... ./scripts/dev.sh --demo 2>&1 | tee /tmp/internalx.log`, then:

```bash
npm i --no-save playwright && npx playwright install chromium     # once
BASE_URL=http://localhost:5000 SERVER_LOG=/tmp/internalx.log DEMO_PASSWORD=... node frontend/e2e/smoke.mjs
```

It signs in (password + the code read from the server log) as L1, L3, L5, L7 and L9, opens every menu view at 1440 px
and 390 px (no console errors, failed requests or horizontal overflow), and exercises tasks, hours, approval, chat
isolation between ventures, documents, invite + accept, search, the assistant, notifications and logout.
Screenshots go to `./e2e-shots`. Exit code 0 only if every check passed. Sign-in is limited to 8 attempts per account per
15 minutes, so restart the server before running it a second time within that window.

**Mobile:** `cd mobile && flutter pub get && flutter run --dart-define=API_URL=http://10.0.2.2:5000/api`

## Configuration

Everything comes from environment variables; nothing secret is committed. Templates:
`backend/.env.example` (every variable, with defaults) and `deployment/production-env.example` (production). The full
production table is in [docs/production-checklist.md](docs/production-checklist.md#1-environment-variables).
The ones you will touch first:

| Variable | Notes |
| :-- | :-- |
| `JWT_SECRET` | 32+ random characters. Production refuses to boot without a real one |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | PostgreSQL connection |
| `FRONTEND_URL` | Public origin; used in email links and as the default CORS origin (required in production) |
| `AUTO_MIGRATE` | `true` (default) applies pending migrations at boot |
| `BOOTSTRAP_ADMIN_EMAIL` / `_PASSWORD` | First Super Admin, first boot only |
| `ALLOW_SELF_REGISTRATION` | `false` by default |
| `ALLOWED_EMAIL_DOMAINS` | Self-registration and Google sign-in allowlist |
| `SMTP_*` | Needed for sign-in codes, invites and resets (in development the code is printed in the server log) |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` or `GEMINI_API_KEY` | Any one enables the AI assistant (`AI_PROVIDER`, `AI_MODEL`, `OPENAI_BASE_URL` optional; see [docs/ai-features.md](docs/ai-features.md)) |
| `ENABLE_SCHEDULER` `APP_TIMEZONE` | Monday digest + daily alerts: on by default in production |
| `TRUST_PROXY` `COOKIE_SECURE` `CORS_ORIGINS` `LOG_LEVEL` | Behind-a-proxy and logging behaviour |

The frontend needs **no** configuration: it calls the API on its own origin and reads the Google client id from
the API at runtime. The only build-time setting is the optional `NEXT_PUBLIC_CURRENCY` (display currency);
`NEXT_PUBLIC_API_URL` is only for `next dev` on another port. `NEXT_PUBLIC_*` values are public; never put a secret behind
that prefix.

**Self-check.** At boot the server logs a `[selfcheck]` block, and Super Admins / Managing Directors see the same report
in **Settings > System** (`GET /api/admin/system-status`): JWT secret, database + migrations, bootstrap admin, SMTP
(with a real connection test), `ANTHROPIC_API_KEY`, Google sign-in, allowed domains, public URL / CORS, proxy,
scheduler and the uploads directory, each `ok` / `warn` / `missing` with a one-line fix. It never shows secret values.

## Production

```bash
cp deployment/production-env.example .env      # fill in every value
docker compose up -d --build                   # app (API + web) + PostgreSQL 16; no build arguments
curl -s http://127.0.0.1:5000/api/ready
```

The multi-stage `Dockerfile` builds the web export into the API image, runs as a non-root user with a
healthcheck, and `docker-compose.yml` keeps data in named volumes (`pgdata`, `uploads`), publishes the
app on loopback only and refuses to start without secrets. Put a TLS proxy or Cloudflare Tunnel
(`deployment/cloudflare/`) in front. Nightly backups: `deployment/backup/`. Operations
(first deploy, backups and restore, upgrades, monitoring): **[docs/production-checklist.md](docs/production-checklist.md)**.

Migrations: `backend/migrations/NNNN_*.sql`, numbered, idempotent, checksummed, applied at boot or with
`npm run migrate`. `deployment/postgres/init/*.sql` is the same schema at head for dev and tests; a test
keeps the two identical.

## Repository layout

```
backend/            Express API (src/routes, controllers, middleware, services, config/selfcheck.js, utils/scope.js), migrations/, tests/, scripts/
frontend/           Next.js 16 web app (static export served by the API), e2e/smoke.mjs (Playwright)
mobile/             Flutter client
deployment/         postgres/init (schema at head), backup/ (nightly dump + restore), cloudflare/ (tunnel config)
docs/               GETTING-STARTED.md (start here), data-isolation.md, production-checklist.md, ai-features.md, HANDOFF.md (status and roadmap)
Dockerfile          production image
docker-compose.yml  production stack; docker-compose.dev.yml is the local database only
scripts/dev.sh      one-command local development (see Quick start); root package.json has `npm run dev`
```

## API overview

Base URL `/api`. Everything except `/api/health`, `/api/ready` and `/api/auth/*` needs a session
(`internalx_token` httpOnly cookie, or `Authorization: Bearer`). Every list endpoint applies the same
scope predicate as the single-row check.

| Area | Paths |
| :-- | :-- |
| Auth | `/auth/config` `/auth/login` `/auth/verify-otp` `/auth/google-login` `/auth/forgot-password` `/auth/reset-password` `/auth/logout` `/auth/me`; `/auth/register` only when enabled |
| People | `/team-members` (list, invite, update, delete, `:id/invite`, `?pending=true`), `/team-members/me/*`, `/team-members/ventures`, `/access-levels`, `PUT /:id/rate` (L<=3) |
| Work | `/projects` `/tasks` `/timesheets` `/documents` `/uploads/:file` |
| Money and insight | `/invoices` `/budget` `/kpis` `/strategy` `/platform-metrics` `/client-portal` |
| Collaboration | `/chat/channels` `/chat/messages` `/notifications` (+ `/preferences`) `/learning` |
| Search and AI | `/search` (scoped full-text, Ctrl+K), `/assistant/*` (Ask InternalX, SSE; staff only; needs `ANTHROPIC_API_KEY`) |
| Governance | `/action-logs` (L1/L2), `/admin/system-status` (L1/L2, configuration self-check) |
| Ops | `/health` (liveness), `/ready` (database + migrations) |

Socket.IO: the server assigns rooms on connect (`venture_<id>`, `global`, `dm_<userId>`); clients can
only join rooms their scope allows, and messages are emitted by the server with the sender taken from
the authenticated user.

## Security

See [SECURITY.md](SECURITY.md) for reporting and the control list. In short: bcrypt passwords, OTP second
step, server-side session revocation, httpOnly cookies, scope enforced in SQL, rate limits, request
validation, a strict CSP, upload allowlists with magic-byte checks, authenticated document downloads,
redacted structured logs with request ids, and an audit trail.

## License

MIT. See [LICENSE](LICENSE). Contributions: [CONTRIBUTING.md](CONTRIBUTING.md).
