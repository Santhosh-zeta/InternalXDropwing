# AI and intelligence features

Four features, all optional, none of them able to see or do more than the signed-in person can.
Access rules are the ones in [data-isolation.md](data-isolation.md); every query below goes through
`backend/src/utils/scope.js`.

| Feature | Needs `ANTHROPIC_API_KEY` | Endpoint |
| --- | --- | --- |
| Search and Ctrl/Cmd+K palette | no | `GET /api/search?q=` |
| Ask InternalX assistant | yes | `/api/assistant/*` |
| Weekly digest and daily alerts | no (the model only adds an optional two-sentence summary) | scheduler, `GET/PUT /api/notifications/preferences` |
| Meeting notes to tasks | yes | `POST /api/assistant/notes/propose`, `POST /api/assistant/notes/create` |

## Search

Postgres full-text search (`to_tsvector('simple', ...)` GIN indexes, migration `0007_search.sql`)
over tasks, projects, documents (file name), announcements, people and chat messages. Each type uses
the same SQL predicate as its list endpoint (`taskWhere`, `projectWhere`, `documentWhere`; the staff
directory rule for people; the channel rules of `chat.service.js` for messages, so direct messages
are visible to their two participants only, even for L1). Clients (L9) search their projects,
deliverables and client-visible documents; never people, chat or announcements. Matching is by
prefix, so "alph" finds "Alpha".

## Ask InternalX

A chat assistant (full page under "Ask InternalX", plus a floating panel on every dashboard page)
that answers questions by calling read-only tools. Model: `ASSISTANT_MODEL`, default
`claude-sonnet-5-5`, streamed to the browser over Server-Sent Events.

### What the model can see

Only what a tool returns, and every tool is a thin wrapper over a scoped query that takes the
caller's scope, re-read from the database on every tool call (so a demotion or deactivation applies
mid-conversation):

`my_tasks`, `list_projects`, `project_summary`, `overdue_tasks`, `upcoming_deadlines`,
`timesheet_summary` (own hours for staff, the venture's for managers), `search`, `announcements`;
managers (L1 to L5) also get `team_workload`; levels 1 to 4 also get `finance_summary` and
`project_finance`, which follow the existing finance rules and the money rules in `utils/rates.js`:
labour cost counts only hours that have a rate, `unrated_hours` is always reported, and the cost is
`null` when no hour has a rate.

Each tool result is capped (300 characters per string, 50 rows, 12,000 characters in total), JSON
encoded with `<` and `>` escaped, and flagged as untrusted data in the system prompt, because it
contains text users typed (task titles, chat, announcements).

### What it can never do

- Write anything. There is no write tool, no raw SQL, and no tool that takes a venture or user id.
  Arguments the model sends are whitelisted per tool and can only narrow a scoped result (for example
  `project_id` on `overdue_tasks` still goes through `taskWhere`; an id outside your scope returns
  nothing or "not found").
- Be used by clients. L9 accounts get HTTP 403 on every assistant endpoint and no launcher.
- Read another user's conversations. Conversations (`assistant_conversations`,
  `assistant_messages`) are keyed on the owner's user id taken from the session.
- Run unaudited: every tool call is written to `audit_logs` (`ASSISTANT_TOOL`, or
  `ASSISTANT_TOOL_DENIED` with the reason).

### Limits and costs

| Limit | Default | Env |
| --- | --- | --- |
| Tool round-trips per question | 6 | `ASSISTANT_MAX_TOOL_ITERATIONS` |
| Messages per user per day | 100 | `ASSISTANT_DAILY_MESSAGE_CAP` |
| Tokens per user per day (input + output) | 300,000 | `ASSISTANT_DAILY_TOKEN_CAP` |
| Requests per user per minute | 10 | `ASSISTANT_RATE_PER_MIN` |
| Output tokens per model call | 4,096 | `ASSISTANT_MAX_OUTPUT_TOKENS` |
| Question length | 4,000 characters | |

Usage is counted in `assistant_usage`, separate from the messages, so deleting a conversation does
not reset the cap. The loop also stops between model calls when the daily token budget is used up,
and aborts the upstream request when the browser disconnects. The system prompt and tool definitions
are a fixed prefix (per-user context such as the date goes in the user turn), marked for prompt
caching.

Rough cost: at the list price of Sonnet 5.5 ($2 per million input tokens, $10 per million output;
cached input is much cheaper) a typical question that makes one or two lookups is a few thousand
input tokens and a few hundred output tokens, in the order of a cent. This is an estimate from the
price list and the caps above, not a measurement: check the Anthropic console after a week of real
use. The hard ceiling per user is the daily token cap.

Conversations are stored in plain text in your database. Question text and tool results are sent to
Anthropic's API; do not enable the assistant if company data may not leave your infrastructure.

## Weekly digest and daily alerts

An in-process scheduler (on by default in production, off in development; `ENABLE_SCHEDULER=true|false`
overrides; `backend/src/services/scheduler.js`), no extra infrastructure. Times use `APP_TIMEZONE` (default `Asia/Kolkata`):

- Mondays from `DIGEST_HOUR` (8): one in-app notification (plus an email when SMTP is configured)
  per internal user: their overdue and due-this-week tasks, projects at risk (open overdue tasks or
  past their end date), for managers the timesheets waiting for their approval and the people with
  open tasks who logged no hours last week, for L6 to L8 a reminder when they logged nothing. Built
  with the person's own scope; nobody is told about another venture. Nothing is sent when there is
  nothing to say.
- Every day from `ALERTS_HOUR` (9), for L1 to L5 only, inside their scope: a day above
  `ALERT_MAX_HOURS_PER_DAY` (14) hours for one person, a project with at least
  `ALERT_OVERDUE_CLUSTER` (3) overdue tasks, an active project with no activity for `ALERT_IDLE_DAYS`
  (14) days, an overdue task with no active assignee. A finding that stays true is repeated at most
  once a week.

Several instances are safe: a Postgres advisory lock serialises them and each occurrence is claimed
in `scheduler_runs` before it runs, so a Monday is sent at most once (a crash mid-run never causes a
duplicate). Opt-outs live in `users.notification_preferences` (`digest`, `alerts`, `email`, all
default on), via `GET/PUT /api/notifications/preferences`. To preview without sending:
`node scripts/run-digest.js --dry`.

If `ANTHROPIC_API_KEY` is set and `DIGEST_AI_SUMMARY` is not `false`, the model writes a two-sentence
summary at the top from that user's own digest numbers and item titles (titles are sanitised and
treated as data). On any failure, or without a key, a deterministic sentence is used instead.

## Meeting notes to tasks

Managers (L1 to L5) paste notes in "Notes to tasks" (Ask InternalX page). The model sees the notes plus
the names of the people and open projects in that manager's scope, and returns draft tasks through a
tool with a JSON schema (the current models reject forced tool choice, so the prompt asks for the call
and the server checks it was made, retrying once). Names are matched back to ids on the server inside
the scope: an unknown or ambiguous name leaves the assignee empty with candidates to choose from.
Nothing is written. `POST /api/assistant/notes/create` then creates only the tasks the manager
confirmed, by calling the normal task controller with the same validation, scope checks, audit and
notifications as `POST /api/tasks`; one failing row does not block the others. Notes are not stored.

## Not configured

Without a key: `GET /api/assistant/status` returns `configured: false`; admins (L1 to L3) get a
setup hint, other users see "not enabled by your administrator"; chat and notes-to-tasks return 503;
nothing crashes and search, digest and alerts keep working.
