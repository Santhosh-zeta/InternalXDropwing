#!/usr/bin/env bash
#
# InternalX: one-command local development.
#
#   ./scripts/dev.sh              set everything up (first run) and serve on http://localhost:5000
#   ./scripts/dev.sh --demo       also load demo data (4 ventures, a user per level; random password printed once)
#   ./scripts/dev.sh --rebuild    rebuild the web app even if it is already built
#   ./scripts/dev.sh --no-start   set up only, do not start the server
#
# What it does (idempotent: safe to re-run, never overwrites existing config or data):
#   1. PostgreSQL: docker-compose.dev.yml when Docker is available, otherwise the database named by
#      DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD in your environment or backend/.env.
#   2. backend/.env from .env.example with a freshly generated JWT_SECRET (only if missing).
#   3. Dependencies, database migrations, a dev Super Admin (credentials printed once, only if none exists).
#   4. The web app, built into backend/public/frontend-build (served by the API: one origin, one port).
#   5. The API on $PORT (default 5000). Sign-in codes appear in this terminal ("OTP for ...").
#
# DEVELOPMENT ONLY: refuses to run with NODE_ENV=production.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$PWD"

DEMO=0; REBUILD=0; START=1
for arg in "$@"; do
  case "$arg" in
    --demo) DEMO=1 ;;
    --rebuild) REBUILD=1 ;;
    --no-start) START=0 ;;
    -h|--help) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 1 ;;
  esac
done

say()  { printf '\n\033[1m> %s\033[0m\n' "$1"; }
ok()   { printf '  ok  %s\n' "$1"; }
die()  { printf '\n\033[0;31mERROR: %s\033[0m\n\n' "$1" >&2; exit 1; }

if [ "${NODE_ENV:-}" = "production" ]; then
  die "scripts/dev.sh is for development only and refuses to run with NODE_ENV=production. See docs/production-checklist.md."
fi
export NODE_ENV=development

say "Checking prerequisites"
command -v node >/dev/null 2>&1 || die "Node.js is not installed (need 20+): https://nodejs.org"
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ] || die "Node $(node -v) is too old (need 20+)."
command -v npm >/dev/null 2>&1 || die "npm is not installed."
ok "node $(node -v)"

# ── backend/.env ────────────────────────────────────────────
say "Configuration"
USE_DOCKER_DB=0
if [ -z "${DB_HOST:-}" ] && docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then USE_DOCKER_DB=1; fi

if [ -f backend/.env ]; then
  ok "backend/.env exists (left untouched)"
else
  cp backend/.env.example backend/.env
  JWT="$(node -e 'console.log(require("crypto").randomBytes(48).toString("base64url"))')"
  if [ "$USE_DOCKER_DB" = 1 ]; then
    DBH=localhost; DBP=5432; DBN=internalx; DBU=postgres; DBW=postgres
  else
    DBH="${DB_HOST:-localhost}"; DBP="${DB_PORT:-5432}"; DBN="${DB_NAME:-internalx}"; DBU="${DB_USER:-}"; DBW="${DB_PASSWORD:-}"
    [ -n "$DBU" ] || die "No Docker found and DB_USER is not set. Either install Docker, or export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD for a PostgreSQL 16 you can reach, then re-run."
  fi
  node - backend/.env "$JWT" "$DBH" "$DBP" "$DBN" "$DBU" "$DBW" "${PORT:-5000}" <<'NODE'
const fs = require('fs');
const [file, jwt, host, port, name, user, pass, appPort] = process.argv.slice(2);
let s = fs.readFileSync(file, 'utf8');
const set = (k, v) => { s = s.replace(new RegExp(`^${k}=.*$`, 'm'), () => `${k}=${v}`); };
set('JWT_SECRET', jwt); set('DB_HOST', host); set('DB_PORT', port); set('DB_NAME', name); set('DB_USER', user); set('DB_PASSWORD', pass);
set('PORT', appPort); set('FRONTEND_URL', `http://localhost:${appPort}`);
fs.writeFileSync(file, s);
NODE
  ok "backend/.env created with a generated JWT_SECRET"
fi

# ── PostgreSQL ──────────────────────────────────────────────
say "Database"
if [ "$USE_DOCKER_DB" = 1 ]; then
  docker compose -f docker-compose.dev.yml up -d >/dev/null
  for _ in $(seq 1 60); do
    docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres -d internalx >/dev/null 2>&1 && break
    sleep 1
  done
  docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres -d internalx >/dev/null 2>&1 \
    || die "PostgreSQL did not become ready. Check: docker compose -f docker-compose.dev.yml logs postgres"
  ok "PostgreSQL (docker) on localhost:5432"
else
  ok "using the database from the environment / backend/.env"
fi

# ── dependencies ────────────────────────────────────────────
say "Dependencies"
[ -d backend/node_modules ] || (cd backend && npm ci --no-audit --no-fund >/dev/null)
ok "backend"
[ -d frontend/node_modules ] || (cd frontend && npm ci --no-audit --no-fund >/dev/null)
ok "frontend"

# ── migrations + admin (+ demo) ─────────────────────────────
say "Schema and accounts"
(cd backend && node src/migrate.js) || die "Could not reach or migrate the database. Check DB_* in backend/.env and that PostgreSQL is running."
(cd backend && node scripts/dev-admin.js)
if [ "$DEMO" = 1 ]; then
  (cd backend && node scripts/seed-demo.js)
fi

# ── web app ─────────────────────────────────────────────────
say "Web app"
BUILD_DIR=backend/public/frontend-build
if [ "$REBUILD" = 1 ] || [ ! -f "$BUILD_DIR/index.html" ]; then
  (cd frontend && NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build >/dev/null) || die "Web build failed. Run: cd frontend && npm run build"
  rm -rf "$BUILD_DIR"; mkdir -p backend/public
  cp -R frontend/out "$BUILD_DIR"
  ok "built into $BUILD_DIR"
else
  ok "already built ($BUILD_DIR); use --rebuild after changing the frontend"
fi

if [ "$START" = 0 ]; then
  say "Set up. Start with: (cd backend && npm start)"
  exit 0
fi

PORT="${PORT:-5000}"
say "Starting InternalX on http://localhost:${PORT}  (Ctrl+C to stop)"
printf '  Sign-in codes (OTP) are printed below as: OTP for <email>: 123456\n  Check your setup in the app: Settings > System.\n\n'
cd backend
export PORT
exec node src/server.js
