# Changelog

All notable changes to InternalX. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [1.0.0] - 2026-11-09 — Production hardening release

### Security
- One access layer (`backend/src/utils/scope.js`) enforces venture and project scoping on every data route, with a cross-venture
  test matrix. Fixed cross-venture reads and writes in tasks, invoices, timesheets, documents, analytics, learning, audit and chat.
- Chat authorised on the server (rooms, REST and sockets); sockets are disconnected when a session is revoked.
- No seeded accounts or shared password hashes: the first Super Admin comes from `BOOTSTRAP_ADMIN_*` or `npm run create-admin`.
- Users can no longer grant or edit levels at or above their own (`canManageUser`); last Super Admin is protected.
- Google sign-in is invite-only and requires a verified email on an allowed domain.
- OTP attempt lockout without account-lockout DoS; sessions revoked on password reset and level/venture changes.
- Removed the SQL/database explorer and the unenforced permission editors and 2FA toggle.
- CSRF origin checks, upload content sniffing, generic 5xx errors, no query values in logs, client invoices without internal rates.
- Dependencies patched: `npm audit --omit=dev` reports 0 vulnerabilities.

### Added
- Ask InternalX assistant (read-only, scoped tools) on Anthropic, OpenAI or Gemini; Ctrl/Cmd-K scoped search; weekly digest and
  daily alerts; meeting notes to draft tasks.
- Real hourly rates (per user, per-project override) replace invented cost figures.
- Invite-only onboarding with set-password links, optional self-registration with admin approval, pending-approval screen.
- Numbered migrations applied at boot, `/api/ready`, structured logs, startup self-check and Settings > System,
  Dockerfile and production compose, backup and restore scripts.
- One-command local setup (`./scripts/dev.sh --demo`), Jest + Supertest suite, Playwright smoke test, Getting Started guide.

### Changed
- Frontend rebuilt on a declarative menu with URL-synced views, shared data hooks and zero lint errors; same-origin API by default.
- Mobile app reads `API_URL` (no hard-coded production host); demo mode off.
