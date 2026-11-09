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
are shared with clients per document by L<=5.

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

`npm run migrate` applies `backend/migrations/NNNN_*.sql` once each
(`schema_migrations` table). `deployment/postgres/init/01_schema.sql` is the
0001 baseline and already contains the 0002 columns, so migrations are
idempotent on fresh and existing databases. Existing deployments: run
`npm run migrate` after pulling.

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
