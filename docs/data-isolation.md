# Data isolation, chat and money

Single source of truth: `backend/src/utils/scope.js` (who sees what) and
`backend/src/utils/rates.js` (how money is computed).

## Access model

| Level | Scope |
| --- | --- |
| L1, L2 | Global: every venture, every row |
| L3 - L5 | Own venture (`users.venture_id`), all of its data |
| L6 - L8 | Own venture, but only projects they are a member of, tasks assigned to / created by them, own timesheets |
| L9 Client | Only projects they are a member of; deliverables assigned to them, documents flagged `client_visible`, invoices for their projects. No internal chat, timesheets, budgets or staff emails |

The scope is re-read from the database on every request (`withScope`), not from
the JWT, so a demotion or deactivation applies immediately. Ids from the request
body or query are never used to grant access: venture and project are derived
from the stored project / task / caller, and every list uses the same SQL
predicate as the single-row check (`projectWhere`, `taskWhere`, `timesheetWhere`,
`documentWhere`).

Notable rules: timesheet approval needs L<=5 inside the scope, never your own
sheet, never someone more senior; invoices and budgets need L<=5 / L<=4; tasks
are edited only by their assignees/creator (staff) or venture admins; documents
are shared with clients per document by L<=5. A client's invoice detail returns totals and
client-safe lines only (date, project, hours, task title when it is their own deliverable): no
rates, per-line prices, staff names or internal timesheet notes.

## Accounts and the team directory

Accounts are invite-only: `POST /api/team-members` (L<=3, `canManageUser` rules) creates the user and
issues a 72 h set-password link (emailed, or returned once when SMTP is missing). Self-registration is
off unless `ALLOW_SELF_REGISTRATION=true`; then accounts are inactive + `pending_approval` with no
venture until L1/L2 approve them (`GET /api/team-members?pending=true`).

`GET /api/team-members` (also the DM picker): L1/L2 everyone; L3-L5 their venture (clients included, for
user management) plus global leadership; L6-L8 their venture plus global leadership, never clients;
L9 nothing. Other ventures' people are never returned. `GET /api/team-members/:id` follows the same rule.

## Chat

Rooms: `venture_<id>` (that venture + global users), `global` (all internal
staff), `dm_<userId>` (your own only). Clients have no chat. The server assigns
the rooms on connect; `join_channel` is validated against the scope. Messages
are persisted once and emitted by the server (`services/chat.service.js`,
`POST /api/chat/messages`); the socket `send_message` event (used by the mobile
app) goes through the same function. `sender_id` / `sender_name` always come
from the authenticated user. `GET /api/chat/channels` lists what the caller may
open.

## Money

Cost of a timesheet row = hours x (`project_members.rate` if set, else
`users.hourly_rate`). No rate means no cost: totals add only rated hours and
report `unrated_hours` / `rate_missing`. Budgets, timesheet costs, invoices and
the client portal all use `utils/rates.js`. Rates are visible and editable by
L<=3 only (`PUT /api/team-members/:id/rate`, L3 only for people below them in
their own venture).

## Migrations

One place: `backend/migrations/NNNN_name.sql` (numbered, idempotent). The runner
(`src/migrate.js`) applies pending files in order, one transaction per file,
under a Postgres advisory lock, and records name + SHA-256 checksum in
`schema_migrations`. Editing an already-applied file is refused; add a new one.

- The server applies pending migrations at boot. `AUTO_MIGRATE=false` opts out
  (then run `npm run migrate`). A failed migration aborts the boot.
- `0001_baseline.sql` builds the whole schema from an empty database, so an empty
  DB + the server is a complete install. `deployment/postgres/init/*.sql` is the
  same schema at head (used by Docker's first start and by the tests);
  `tests/schema-equivalence.test.js` fails if the two ever diverge, so every
  schema change must touch both: a new migration AND `init/01_schema.sql`.
- `GET /api/ready` reports pending migrations; `GET /api/health` is liveness.

## Tests and demo data

```
cd backend
node scripts/seed-demo.js        # 4 ventures, a user per level, projects, tasks, timesheets...
node scripts/dev-token.js dd.l5  # session token for curl
npm test                         # needs DB_* env pointing at a disposable database
```

`seed-demo.js` and `dev-token.js` refuse to run with `NODE_ENV=production`. The
test suite (`tests/idor.test.js`, `chat.test.js`, `money.test.js`) seeds only
rows tagged as demo data; run it against a development or CI database, never
production.
