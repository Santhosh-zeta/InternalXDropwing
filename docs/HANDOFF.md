# Handoff: production-hardening effort (session state)

Branch of record: `claude/explore-management-website-d9v4hr` (everything merged so far is here).
Backend: 329 tests passing (B2 merged) (`cd backend && npm ci && TEST_DATABASE_URL=... JWT_SECRET=... npm test`), 0 prod vulnerabilities.

## Done and merged
- Phase 0: safe fixes, dead scripts removed.
- Dependencies patched (audit 0 prod vulns).
- A1: bootstrap admin (no seeded passwords), Google login invite-only, `canManageUser` ceilings, OTP lockout,
  session revoke, DB explorer / permission editors / 2FA toggle removed, Jest + CI.
- A2: `backend/src/utils/scope.js` single access layer, IDOR fixes on all data routes, chat authorization
  (`services/chat.service.js`, `src/socket.js`), real hourly rates (`utils/rates.js`), IDOR matrix tests.
- B1: one migration system (`backend/migrations`, auto-run at boot), invite-only accounts + invite links,
  team-list scoping, pino logging, /api/ready, Dockerfile + prod compose + backups, docs/production-checklist.md,
  README rewrite, secret-field sweep test.

## B2 MERGED (migrations renumbered 0007-0009). B3 NOT merged (agent hit the usage limit mid-run).
## Original notes on the two branches:
- `claude/wip-b2-assistant-search`: B2. Scoped full-text search + Ctrl/Cmd-K palette, "Ask InternalX" Claude
  assistant (read-only scoped tools, SSE, caps, audit), weekly digest + alert rules + scheduler,
  meeting-notes -> draft tasks. Last commit: notes-to-tasks backend; the NotesToTasksModal UI and api.ts edits were uncommitted.
- `claude/wip-b3-frontend`: B3. Lint/typing cleanup, menu config with URL-synced views, useApi hook,
  Today home, split big views, Playwright walk of every view per role. Mostly uncommitted when snapshotted.

## Remaining plan
1. Resume B3's work (branch `claude/wip-b3-frontend`, last WIP snapshot; it was in the middle of the lint/typing cleanup and removing fake monthly-performance fallbacks) and merge it. B2 is already merged. Merge (expect conflicts in dashboard/page.tsx, lib/api.ts, server.js mounts,
   backend/migrations numbering, deployment init schema). Run backend tests + `frontend: tsc, lint, build`.
2. Make lint blocking in CI (remove continue-on-error) once lint is 0.
3. Frontend default API URL: `lib/api.ts`, SocketProvider, DocumentsView, SettingsView fall back to a hard-coded
   host when NEXT_PUBLIC_API_URL is unset; default to same-origin.
4. Wire UI for pending-approval users (`GET /api/team-members?pending=true`) and an hourly-rate field in the user editor
   (`PUT /api/team-members/:id/rate`).
5. Run the real app in a browser (Playwright) for L1/L3/L5/L7/L9 on seeded demo data (`backend/scripts/seed-demo.js`).
6. Independent Opus security review of the merged result; fix findings.
7. Build the Docker image and run the prod compose stack once on a machine with Docker (never done here).
8. Flutter app: edits (removed screens, demo mode off) were never compiled (no Flutter in the sandbox). Run `flutter analyze`.
9. Needs the owner's env: ANTHROPIC_API_KEY (assistant), SMTP (invites, digests), GOOGLE_CLIENT_ID, bootstrap admin env.

## Gotchas learned
- `.gitignore` has `env.*`; it hid `src/config/env.js` (now un-ignored). Don't name source files env.*.
- Agents must use unique scratch filenames; shared ones were overwritten.
