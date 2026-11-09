<div align="center">

<img src="docs/images/banner.png" alt="Dropwing Groups Engineering" width="100%" />

# InternalX

**One internal operating system for a multi-venture company: web, mobile and API.**

Four separate ventures, nine access levels, one login. People only ever see what their venture and
project membership entitles them to; the Managing Director sees everything.

[What it does](#what-it-does) · [Access model](#access-model) · [Accounts and invites](#accounts-and-invites) · [Quick start](#quick-start) · [Configuration](#configuration) · [Production](#production) · [API](#api-overview) · [Security](#security)

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

Prerequisites: Node.js 20, Docker (or a local PostgreSQL 16), Flutter 3 for the mobile app.

```bash
git clone https://github.com/Santhosh-zeta/InternalXDropwing.git && cd InternalXDropwing
./scripts/setup.sh                      # or do the steps below by hand
```

```bash
# 1. database (loopback only, throwaway dev credentials)
docker compose -f docker-compose.dev.yml up -d

# 2. API
cd backend && cp .env.example .env      # set JWT_SECRET, DB_*; add BOOTSTRAP_ADMIN_* for a first login
npm ci && npm run dev                   # http://localhost:5000, applies migrations at boot

# 3. web
cd ../frontend && cp .env.example .env.local && npm ci && npm run dev   # http://localhost:3000
```

For local exploration only: `node scripts/seed-demo.js` in `backend/` creates four ventures with a
user per level, projects, tasks and timesheets; `node scripts/dev-token.js dd.l5` prints a session
token for curl. Both refuse to run with `NODE_ENV=production`. The dev login page shows quick-login
buttons for demo accounts; they are compiled out of production builds.

**Tests.** Jest + Supertest against a disposable database (the suite drops and recreates its `public`
schema, so never point it at real data):

```bash
createdb internalx_test
cd backend && TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/internalx_test npm test
```

**Mobile:** `cd mobile && flutter pub get && flutter run --dart-define=API_URL=http://10.0.2.2:5000/api`

## Configuration

Everything comes from environment variables; nothing secret is committed. Templates:
`backend/.env.example` (development) and `deployment/production-env.example` (production). The full
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
| `SMTP_*` | Needed for sign-in codes, invites and resets |
| `TRUST_PROXY` `COOKIE_SECURE` `CORS_ORIGINS` `LOG_LEVEL` | Behind-a-proxy and logging behaviour |

Frontend: `NEXT_PUBLIC_API_URL` (backend origin, baked into the bundle at build time) and
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`. `NEXT_PUBLIC_*` values are public; never put a secret behind that prefix.

## Production

```bash
cp deployment/production-env.example .env      # fill in every value
docker compose up -d --build                   # app (API + web) + PostgreSQL 16
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
backend/            Express API (src/routes, controllers, middleware, services, utils/scope.js), migrations/, tests/, scripts/
frontend/           Next.js 16 web app (static export served by the API)
mobile/             Flutter client
deployment/         postgres/init (schema at head), backup/ (nightly dump + restore), cloudflare/ (tunnel config)
docs/               data-isolation.md, production-checklist.md, client portal spec, visual guide
Dockerfile          production image
docker-compose.yml  production stack; docker-compose.dev.yml is the local database only
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
| Collaboration | `/chat/channels` `/chat/messages` `/notifications` `/learning` |
| Governance | `/action-logs` |
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
