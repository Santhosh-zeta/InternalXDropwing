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

3. **Don't reuse the seed passwords.** `npm run seed` creates demo accounts, including an L1 Super
   Admin, with a well-known password. It's for local development. Never run it against anything
   reachable from the internet.

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
| Level-based route authorisation | `requireLevel()` in `auth.middleware.js` |
| Venture scoping applied in SQL, not in the UI | every controller |
| Socket.IO handshake authentication | `backend/src/server.js` |
| Parameterised queries throughout — no ORM, no string-built SQL | `backend/src/config/database.pg.js` |
| Rate limiting on the unauthenticated surface | `backend/src/middleware/rateLimit.middleware.js` |
| Request validation on auth endpoints | `backend/src/middleware/validate.middleware.js` |
| Security headers | `helmet` in `server.js` |
| CORS allowlist — single origin, credentials on | `server.js` |
| Forced HTTPS in production | `server.js` |
| Audit logging of privileged mutations | `backend/src/services/audit.service.js` |
| Email verification via OTP | `backend/src/utils/otp.js` |
| Demo credentials excluded from production builds | `frontend/src/lib/constants.ts` |

## Known gaps

Stated plainly, because a security policy that only lists wins isn't useful:

- **JWTs are stateless.** There is a `sessions` table, but tokens are not checked against it, so a
  token stays valid until it expires even after logout. Rotating `JWT_SECRET` is the only way to
  revoke everything at once.
- **Content Security Policy is disabled** (`helmet({ contentSecurityPolicy: false })`) because the
  Next.js bundle needs inline styles. A proper nonce-based policy is still to be done.
- **Validation covers the auth routes only.** The remaining endpoints rely on parameterised queries
  and level gating, which stops injection and unauthorised access but not malformed input.
- **No automated security testing** in CI yet — see the roadmap in the README.

## Secret hygiene in this repository

`.gitignore` blocks `.env` files, keys, certificates, keystores, service-account JSON, and
`google-services.json` / `GoogleService-Info.plist`. If you add a new kind of secret file, add the
pattern there in the same commit.

Before pushing, it's worth a quick check that nothing sensitive slipped into a diff:

```bash
git diff --cached | grep -nEi '(password|secret|api[_-]?key|token)\s*[:=]\s*["'"'"'][^"'"'"']{8,}'
```

GitHub's own secret scanning and push protection are enabled on this repository as a second net.
