# Project status and roadmap

InternalX is feature-complete for the four-venture internal team plus external clients, and ready to deploy once the
owner supplies configuration (below). Access rules: [data-isolation.md](data-isolation.md). Operations:
[production-checklist.md](production-checklist.md). AI features: [ai-features.md](ai-features.md).

## What is built

- Access model enforced in SQL by one module (`backend/src/utils/scope.js`): L1/L2 global, L3-L5 their venture,
  L6-L8 their projects and tasks, L9 clients only their projects and client-safe data. Covered by an IDOR matrix test suite.
- Invite-only accounts (set-password links, no shipped credentials), OTP second step with lockout, server-side session
  revocation, Google sign-in for existing accounts, optional self-registration with admin approval.
- Projects, tasks, timesheets with approval, documents (venture / project / company-wide, optional client sharing),
  invoices and budget from one rate source, strategy (OKRs, risks, KPIs), team chat (venture, global, DM rooms),
  notifications, learning hub, audit log, client portal.
- Scoped full-text search (Ctrl+K), "Ask InternalX" assistant (read-only, scoped tools), weekly digest and daily alerts,
  meeting notes to draft tasks.
- One migration system applied at boot, health and readiness endpoints, structured logs, Docker image + production
  compose, backup and restore scripts, a startup self-check (boot log and Settings > System).
- Backend tests (Jest), frontend typecheck/lint/build in CI, and a browser smoke test (`frontend/e2e/smoke.mjs`).

## What the owner must provide

Nothing is required to start locally (`./scripts/dev.sh --demo`). For a real deployment, set these environment
variables (the **Settings > System** page and the boot log tell you which are still missing):

| Needed for | Variables |
| :-- | :-- |
| Anyone to sign in | `JWT_SECRET`, `FRONTEND_URL` / `PUBLIC_URL`, `POSTGRES_PASSWORD`, `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` (first boot) |
| The sign-in code, invites, resets, digest email | `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` |
| Ask InternalX, AI digest summary, notes to tasks | `ANTHROPIC_API_KEY` |
| Google sign-in (optional) | `GOOGLE_CLIENT_ID`, and `ALLOWED_EMAIL_DOMAINS` set to your domains |
| Behind a proxy / tunnel | `TRUST_PROXY=1` |

## Known limitations

- **No SMTP, no sign-in in production.** The code step needs email; only development prints the code to the server log.
- Invoices are derived from approved timesheets (grouped by venture and month); there is no payment tracking, tax or
  numbering beyond that, and the invoice sheet is USD formatted.
- One currency, one time zone for the schedule (`APP_TIMEZONE`), English only.
- Chat has no edit, delete, attachments or read receipts; client portal has no requirements / change-request / ticket centres.
- Uploads live on local disk (the `uploads` volume); there is no object-storage option or virus scanning.
- The in-process scheduler and Socket.IO assume a single region; several app instances work for the scheduler (advisory
  lock) but Socket.IO rooms are not shared between instances (no Redis adapter), so run one instance for live chat.
- The Docker image and production compose stack have not been built or run yet (no Docker daemon was available while
  developing): do a first deploy on a staging host and follow [production-checklist.md](production-checklist.md).
- The Flutter app in `mobile/` has not been compiled against the latest API changes: run `flutter analyze` and a
  device test before shipping it.

## Roadmap

1. First staging deploy with Docker; restore-test a backup.
2. Run `frontend/e2e/smoke.mjs` in CI against a booted stack (needs Playwright in the pipeline).
3. Pin GitHub Actions by commit SHA; make lint a required check.
4. Mobile: `flutter analyze`, align screens with the current permissions, release builds.
5. Payment status on invoices, per-venture currency and branding on the invoice sheet.
6. Redis adapter for Socket.IO if more than one app instance is needed.
7. Object storage + malware scan for uploads.
