# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Email **contact@dropwinggroups.com** with:

- what the issue is and roughly how severe you think it is,
- the steps to reproduce it (a request, a payload, a screenshot — whatever makes it concrete),
- which version or commit you tested against.

We aim to acknowledge within **72 hours** and to have a fix or a concrete plan within **30 days**
for anything that turns out to be exploitable. We're happy to credit you in the release notes
unless you'd rather stay anonymous.

## Scope

In scope: the Express API (`backend/`), the Next.js web client (`frontend/`), the Flutter app
(`mobile/`), and the deployment configuration (`deployment/`).

Out of scope: findings that require an already-compromised host, denial of service through raw
volume, missing headers with no demonstrated impact, and anything against a deployment that isn't
ours.

## If you run your own instance

This repository ships **no credentials**. Everything sensitive is read from environment variables,
and no `.env` file is tracked — only `.env.example` templates with placeholder values.

Before you expose an instance to a network:

1. **Generate your own `JWT_SECRET`.**
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
   Anyone who knows this value can mint a valid Super Admin token. Treat a leaked one the way you
   would treat a leaked root password: rotate it, which invalidates every outstanding session.

2. **Use a dedicated database role.** The application user needs `SELECT`, `INSERT`, `UPDATE`,
   `DELETE` on the application schema — not `SUPERUSER`, not `CREATEDB`, not ownership of the
   database.

3. **Never run `npm run seed:dev` in production.** It creates demo accounts with a well-known
   password and refuses to run when `NODE_ENV=production`. Production has no seeded users: the first
   Super Admin comes from `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` (first boot only —
   remove the password afterwards) or `npm run create-admin`.

4. **Set `NODE_ENV=production`.** It switches cookies to `secure`, enables the HTTPS redirect, and
   strips the demo quick-login accounts out of the web bundle.

5. **Terminate TLS in front of the app** and keep the database off the public internet. The
   Cloudflare Tunnel setup in [`deployment/cloudflare/`](deployment/cloudflare/) does both without
   opening an inbound port.

6. **Back up `backend/uploads/`** — user-uploaded documents live on disk, not in the database, and
   are not covered by a database dump.

## What's implemented

| Control | Where |
| :-- | :-- |
| bcrypt password hashing, 12 rounds | `backend/src/controllers/auth.controller.js` |
| JWT sessions, 8 h expiry, `httpOnly` cookie | `backend/src/middleware/auth.middleware.js` |
| **Real server-side session revocation** — a token dies the instant `/api/auth/logout` runs, not at its natural 8h expiry | `backend/src/services/session.service.js`, checked in `authenticate()` and the Socket.IO handshake |
| OTPs hashed (HMAC-SHA256, keyed by `JWT_SECRET`) and compared in constant time — never stored in the clear | `backend/src/utils/otp.js` |
| Level-based route authorisation | `requireLevel()` in `auth.middleware.js` |
| Venture scoping applied in SQL, not in the UI | every controller |
| **The session token is never held in client-side JavaScript.** The web app relies solely on the `httpOnly` cookie the server sets — nothing in `localStorage`, nothing in a JS-writable cookie — so an XSS bug has nothing to exfiltrate. The current, server-verified user (not a client-cached copy) is what every view in the dashboard reads its own access level from. | `frontend/src/lib/api.ts`, `frontend/src/components/{RequireAuth,AuthUserContext}.tsx` |
| Socket.IO handshake authentication — accepts `auth.token` (mobile), an `Authorization` header, or the `httpOnly` cookie parsed off the raw handshake (web); revocation-checked the same way as REST | `backend/src/server.js` |
| Upload MIME/extension allowlist (blocks a disguised executable) plus authenticated, venture-scoped document downloads in place of a fully public `/uploads` | `backend/src/middleware/upload.middleware.js`, `backend/src/routes/uploads.routes.js` |
| Read-only-enforced SQL console for L1 — single `SELECT` only, no chained statements, a row cap and a statement timeout, every attempt audit-logged | `backend/src/utils/sqlGuard.js`, `backend/src/routes/database.routes.js` |
| Parameterised queries throughout — no ORM, no string-built SQL | `backend/src/config/database.pg.js` |
| Rate limiting across the whole API, with tighter limits on uploads, the SQL console, and reporting endpoints, keyed on the verified user id where available | `backend/src/middleware/rateLimit.middleware.js` |
| Request validation on every mutating endpoint (not just auth) | `backend/src/middleware/validate.middleware.js` |
| A real Content-Security-Policy (documented exceptions below) | `helmet` config in `server.js` |
| CORS allowlist — single origin, credentials on | `server.js` |
| Forced HTTPS in production | `server.js` |
| Audit logging of privileged mutations | `backend/src/services/audit.service.js` |
| Demo credentials excluded from production builds | `frontend/src/lib/constants.ts` |

## Known gaps

Stated plainly, because a security policy that only lists wins isn't useful:

- **The CSP is not nonce-based.** The server serves a static Next.js export (`express.static`), so
  there's no per-request template to stamp a nonce into. Concretely, the policy allows
  `script-src 'unsafe-inline'` (Next's App Router streams hydration data as inline `<script>`
  blocks with no stable hash across builds), `style-src 'unsafe-inline'` (React/Framer Motion
  mutate inline styles every frame), and `https://accounts.google.com` on `script-src`/
  `connect-src`/`frame-src` (Google Sign-In). Everything else is locked down — `object-src`,
  `frame-ancestors` and `base-uri` are all `'none'`/`'self'`, and nothing is wildcarded on
  `connect-src` or `img-src`, so this still meaningfully blocks exfiltration even with the loose
  `script-src`.
- **Validation is hand-written per route**, not schema-driven — thorough where it exists, but a
  new endpoint has to remember to add its own rules; nothing enforces that structurally.
- **No automated security testing** in CI yet — see the roadmap in the README.
- **Session revocation fails open** if the `sessions` table itself becomes unreachable (logged
  loudly rather than taking the app down for an operator's migration gap) — see
  `session.service.js` for the reasoning.

## Secret hygiene in this repository

`.gitignore` blocks `.env` files, keys, certificates, keystores, service-account JSON, and
`google-services.json` / `GoogleService-Info.plist`. If you add a new kind of secret file, add the
pattern there in the same commit.

Before pushing, it's worth a quick check that nothing sensitive slipped into a diff:

```bash
git diff --cached | grep -nEi '(password|secret|api[_-]?key|token)\s*[:=]\s*["'"'"'][^"'"'"']{8,}'
```

CI runs the same check on every push and pull request (`.github/workflows/ci.yml`). Enabling
GitHub's secret scanning and push protection under **Settings → Code security** is worth doing as
a second net.
