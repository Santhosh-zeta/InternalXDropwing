# Production checklist

InternalX is one container (Express API + the static web app, same origin) plus PostgreSQL 16.
This page is everything needed to run it for real: configuration, first deploy, backups,
upgrades and monitoring. Access rules are in [data-isolation.md](data-isolation.md).

## 1. Environment variables

Set these in `.env` (template: `deployment/production-env.example`). The server **refuses to boot in
production** with a missing or placeholder `JWT_SECRET`, missing `DB_*`, or missing `FRONTEND_URL`.

| Variable | Required | Default | Purpose |
| :-- | :-- | :-- | :-- |
| `PUBLIC_URL` | compose | none | Public https origin. Compose passes it to the app as `FRONTEND_URL`. Nothing is baked into the web build, so changing it only needs a restart. |
| `FRONTEND_URL` | yes | none | Same value outside compose. Used in invite / reset emails and as the default CORS origin. |
| `POSTGRES_PASSWORD` | compose | none | Database password (no default; compose refuses to start without it). Also `POSTGRES_USER`, `POSTGRES_DB` (default `internalx`). |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | yes | none | Database connection (compose fills them in). |
| `JWT_SECRET` | yes | none | Session signing key, 32+ random characters. Also keys the OTP hash. Rotating it signs everyone out. |
| `NODE_ENV` | yes | none | `production`: Secure cookies, HTTPS redirect, config checks, no demo accounts in the bundle. |
| `PORT` | no | `5000` | Listen port inside the container. |
| `AUTO_MIGRATE` | no | `true` | Apply pending migrations at boot; `false` to run `npm run migrate` yourself. |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | first boot | none | Creates the first Super Admin when none exists (password 12+ chars, mixed classes). Remove the password afterwards. |
| `ALLOW_SELF_REGISTRATION` | no | `false` | `true` lets people request an account at `/register`; it is created pending and inactive until an admin approves it. |
| `ALLOWED_EMAIL_DOMAINS` | no | built-in list | Comma list for self-registration and Google sign-in. **Set it to your domains.** |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` | effectively yes | none | Delivers sign-in codes (OTP), invites and password resets. Without SMTP nobody can complete the OTP step and invite links must be copied by hand. |
| `GOOGLE_CLIENT_ID` | no | none | Enables Google sign-in (the web app gets the public id from the API at runtime). Accounts must already exist. |
| `TRUST_PROXY` | behind a proxy | off | Proxy hops in front of the app (`1` for Caddy/nginx/Cloudflare Tunnel). Wrong values distort client IPs and rate limiting. |
| `COOKIE_SECURE` | no | on in production | `false` only for plain-http LAN installs. |
| `CORS_ORIGINS` | no | `FRONTEND_URL` | Extra browser origins, comma list. Not needed when everything is served from `PUBLIC_URL`. |
| `JWT_EXPIRES_IN` | no | `8h` | Session lifetime. |
| `LOG_LEVEL` | no | `info` | `trace` .. `fatal`, or `silent`. |
| `OTP_PEPPER` | no | derived from `JWT_SECRET` | Separate key for the OTP hash. |
| `APP_PORT` | no | `5000` | Host port (127.0.0.1) the container is published on. |
| `ANTHROPIC_API_KEY` **or** `OPENAI_API_KEY` **or** `GEMINI_API_KEY` | no | none | Any one enables "Ask InternalX", AI digest summaries and notes-to-tasks. Without it the assistant shows "not set up". Tuning knobs (`ASSISTANT_*`, `DIGEST_*`): [ai-features.md](ai-features.md). |
| `ENABLE_SCHEDULER` | no | **on in production**, off in development | Monday digest and daily alerts, in-process. Safe with several instances (advisory lock + run log), so the default needs no thought; `false` turns it off. Without SMTP digests are in-app notifications only. |
| `APP_TIMEZONE` | no | `Asia/Kolkata` | IANA zone for the digest / alert schedule (`DIGEST_HOUR` 8 Mondays, `ALERTS_HOUR` 9 daily). |
| `SESSION_CACHE_TTL_MS` | no | built-in | Session lookup cache; `0` always reads the database. |

Every variable the backend reads is documented, with its default, in `backend/.env.example` (a test fails if
the code reads one that is not listed there).

## 2. First deploy

Prerequisites: a Linux host with Docker + the compose plugin, a DNS name, a TLS terminator in front
(Caddy, nginx, or a Cloudflare Tunnel: see `deployment/cloudflare/`), and an SMTP account. There are no build
arguments: `docker compose up -d --build` is the whole build.

```bash
git clone <your fork> /opt/internalx && cd /opt/internalx
cp deployment/production-env.example .env && chmod 600 .env
# edit .env: PUBLIC_URL, POSTGRES_PASSWORD, JWT_SECRET, SMTP_*, ALLOWED_EMAIL_DOMAINS, TRUST_PROXY,
# BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD
docker compose up -d --build
docker compose logs -f app       # look for: "applied 0001_baseline.sql ... InternalX API listening"
curl -s http://127.0.0.1:5000/api/ready          # {"status":"ready"}
```

The boot log ends with a `[selfcheck]` block (ok / warn / missing, each with a one-line fix), and the same report is
in the app under **Settings > System** (Super Admin and Managing Director only; it also tests the SMTP login).
Fix every `MISSING` line before inviting anyone.

1. **Bootstrap admin.** On first boot the Super Admin (L1) is created from the two `BOOTSTRAP_ADMIN_*`
   variables. Sign in (password, then the emailed code), then **delete `BOOTSTRAP_ADMIN_PASSWORD` from
   `.env`** and `docker compose up -d`. Lost access later: `docker compose exec app node scripts/create-admin.js --email you@company.com`
   (password from `CREATE_ADMIN_PASSWORD` or a hidden prompt).
2. **Invite people.** User Management > Invite. They get an email with a 72-hour set-password link
   (no temporary passwords exist). Without SMTP the API returns the one-time link to the admin once.
   Create the L3 admin of each venture first; they invite their own people.
3. **TLS.** Terminate https in front of `127.0.0.1:5000`, forward WebSocket upgrades (`/socket.io`), and
   set `TRUST_PROXY=1`. Example Caddyfile: `internalx.example.com { reverse_proxy 127.0.0.1:5000 }`.
4. **Do not** run `seed-demo.js`, `dev-admin.js` or the test suite against this database.

## 3. Backups and restore

Two things hold state: the `pgdata` volume (database) and the `uploads` volume (documents, avatars).

- **Database, nightly:** `deployment/backup/backup.sh` writes `backups/internalx_<stamp>.sql.gz`, prunes
  after 14 days and refuses to keep an empty dump. Schedule it with `deployment/backup/internalx-backup.cron`
  (02:15). Copy the dumps off the machine.
- **Uploads:** `docker run --rm -v internalx_uploads:/data -v "$PWD/backups":/out alpine tar czf /out/uploads_$(date +%F).tgz -C /data .`
  (the volume is prefixed with the compose project name; see `docker volume ls`).
- **Restore:** `deployment/backup/restore.sh backups/internalx_<stamp>.sql.gz` (asks for the database
  name, stops the app, recreates the database, loads the dump, starts the app; older dumps are
  brought forward by the boot migrations).
- **Test the restore** on a scratch host before you need it. An untested backup is a hope.

## 4. Upgrades and migrations

```bash
cd /opt/internalx && git pull
deployment/backup/backup.sh                 # always back up first
docker compose up -d --build                # new image; migrations run at boot
docker compose logs --tail=50 app
curl -s http://127.0.0.1:5000/api/ready
```

- Migrations are numbered, idempotent SQL files in `backend/migrations/`, applied once each in a
  transaction under an advisory lock; their checksums are stored. A failing migration **stops the boot**
  (the previous container keeps serving only if you start the new one alongside; otherwise restore the
  backup). `/api/ready` returns 503 when `AUTO_MIGRATE=false` and migrations are pending (the names are in the app log, not the response).
- Never edit an applied migration (the runner refuses); add a new one, and mirror the change in
  `deployment/postgres/init/01_schema.sql` (a test fails if the two drift).
- Rollback = restore the pre-upgrade backup and the previous image tag; migrations are forward-only.

## 5. Monitoring

- **Liveness:** `GET /api/health` (process is up; no database access). Used by the container `HEALTHCHECK`.
- **Readiness:** `GET /api/ready` (database reachable and no pending migrations; 503 while draining on
  shutdown). Point your load balancer / uptime monitor here.
- **Logs:** one JSON line per event on stdout (`docker compose logs app`), each request with an `id`
  that is also returned as `X-Request-Id` (quote it in bug reports; a proxy-supplied `X-Request-Id` is reused).
  Authorization, cookies, passwords, tokens and invite links are redacted. Ship them with your usual
  collector; alert on `level >= 50` and on 5xx rates.
- **Graceful shutdown:** `docker compose stop app` sends SIGTERM; in-flight requests finish (10 s cap).
- **Disk:** watch the `pgdata`, `uploads` and backup directories.
- **Audit trail:** privileged actions are in the `audit_logs` table (Audit page for L1/L2).

## 6. Hardening notes

- The app container is non-root, read-only root filesystem, no capabilities; the database has no
  published port. Keep it that way.
- CSP, HSTS, `nosniff`, same-origin resource policy are set by the app (Helmet). Uploads are limited to
  an allowlist (pdf, office, txt/csv, png/jpg/webp), checked by extension, declared type **and** magic
  bytes; HTML, SVG and executables are refused. Documents are only served to people entitled to them;
  avatars are public by design (random file names, images only).
- Run `npm audit --omit=dev` in `backend/` on each release (CI keeps it at zero).
- Rotating `JWT_SECRET` invalidates all sessions and pending OTP codes.
