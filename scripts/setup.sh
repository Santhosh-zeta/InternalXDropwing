#!/usr/bin/env bash
#
# InternalX — one-command development setup.
#
#   ./scripts/setup.sh          full bootstrap: database, env files, deps, seed
#   ./scripts/setup.sh --no-db  everything except starting PostgreSQL
#   ./scripts/setup.sh --reset  wipe the database volume and start clean
#
# Safe to re-run. Existing .env files are never overwritten.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$PWD"

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[0;31m'; GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'; BLUE=$'\033[0;34m'; NC=$'\033[0m'

step()  { printf '\n%s▸ %s%s\n' "$BOLD$BLUE" "$1" "$NC"; }
ok()    { printf '  %s✓%s %s\n' "$GREEN" "$NC" "$1"; }
warn()  { printf '  %s!%s %s\n' "$YELLOW" "$NC" "$1"; }
die()   { printf '\n%s✗ %s%s\n\n' "$RED" "$1" "$NC" >&2; exit 1; }
skip()  { printf '  %s· %s%s\n' "$DIM" "$1" "$NC"; }

START_DB=1
RESET_DB=0
for arg in "$@"; do
  case "$arg" in
    --no-db) START_DB=0 ;;
    --reset) RESET_DB=1 ;;
    -h|--help) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Unknown option: $arg (try --help)" ;;
  esac
done

# ─────────────────────────────────────────────────────────────
step "Checking prerequisites"
# ─────────────────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || die "Node.js is not installed. Install Node 18 or newer: https://nodejs.org"

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 18 ] || die "Node $(node -v) is too old. InternalX needs Node 18 or newer."
ok "Node $(node -v)"

command -v npm >/dev/null 2>&1 || die "npm is not installed."
ok "npm $(npm -v)"

DB_MODE=""
if [ "$START_DB" -eq 1 ]; then
  if docker compose version >/dev/null 2>&1; then
    DB_MODE="compose"; ok "Docker Compose available"
  elif command -v docker-compose >/dev/null 2>&1; then
    DB_MODE="compose-legacy"; ok "docker-compose (v1) available"
  elif command -v psql >/dev/null 2>&1; then
    DB_MODE="psql"
    warn "Docker not found — will use your local PostgreSQL via psql instead"
  else
    die "Neither Docker nor psql found. Install Docker Desktop, or PostgreSQL 16, or re-run with --no-db."
  fi
fi

# ─────────────────────────────────────────────────────────────
step "Creating environment files"
# ─────────────────────────────────────────────────────────────
gen_secret() {
  node -e 'console.log(require("crypto").randomBytes(48).toString("base64url"))'
}

if [ -f backend/.env ]; then
  skip "backend/.env already exists — left untouched"
else
  [ -f backend/.env.example ] || die "backend/.env.example is missing."
  cp backend/.env.example backend/.env
  SECRET=$(gen_secret)
  # Replace the placeholder with a real generated secret, whatever the placeholder says.
  node - "$ROOT/backend/.env" "$SECRET" <<'NODE'
const fs = require('fs');
const [file, secret] = process.argv.slice(2);
let s = fs.readFileSync(file, 'utf8');
s = s.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
if (!/^JWT_SECRET=/m.test(s)) s += `\nJWT_SECRET=${secret}\n`;
// Point at the local dev database this script starts.
s = s.replace(/^DB_HOST=.*$/m, 'DB_HOST=localhost');
s = s.replace(/^DB_PORT=.*$/m, 'DB_PORT=5432');
s = s.replace(/^DB_NAME=.*$/m, 'DB_NAME=internalx');
s = s.replace(/^DB_USER=.*$/m, 'DB_USER=postgres');
s = s.replace(/^DB_PASSWORD=.*$/m, 'DB_PASSWORD=postgres');
fs.writeFileSync(file, s);
NODE
  ok "backend/.env created with a freshly generated JWT_SECRET"
fi

if [ -f frontend/.env.local ]; then
  skip "frontend/.env.local already exists — left untouched"
else
  [ -f frontend/.env.example ] || die "frontend/.env.example is missing."
  cp frontend/.env.example frontend/.env.local
  ok "frontend/.env.local created"
fi

# ─────────────────────────────────────────────────────────────
if [ "$START_DB" -eq 1 ]; then
step "Starting PostgreSQL"
# ─────────────────────────────────────────────────────────────
  case "$DB_MODE" in
    compose|compose-legacy)
      DC="docker compose -f docker-compose.dev.yml"; [ "$DB_MODE" = "compose-legacy" ] && DC="docker-compose -f docker-compose.dev.yml"

      if [ "$RESET_DB" -eq 1 ]; then
        warn "--reset given: destroying the existing database volume"
        $DC down -v >/dev/null 2>&1 || true
      fi

      $DC up -d >/dev/null
      ok "container starting"

      printf '  waiting for PostgreSQL to accept connections'
      for _ in $(seq 1 60); do
        if $DC exec -T postgres pg_isready -U postgres -d internalx >/dev/null 2>&1; then
          printf '\n'; ok "PostgreSQL is ready on localhost:5432"
          break
        fi
        printf '.'; sleep 1
      done
      $DC exec -T postgres pg_isready -U postgres -d internalx >/dev/null 2>&1 \
        || die "PostgreSQL did not become ready. Check: $DC logs postgres"
      skip "schema, indexes and seed are applied automatically on first start"
      ;;

    psql)
      export PGPASSWORD=postgres
      psql -h localhost -U postgres -lqt 2>/dev/null | cut -d\| -f1 | grep -qw internalx \
        || createdb -h localhost -U postgres internalx
      for f in 01_schema 02_indexes 03_seed; do
        psql -h localhost -U postgres -d internalx -v ON_ERROR_STOP=1 -q \
          -f "deployment/postgres/init/${f}.sql" >/dev/null 2>&1 \
          && ok "applied ${f}.sql" \
          || warn "${f}.sql reported errors (likely already applied) — continuing"
      done
      ;;
  esac
else
step "Skipping database (--no-db)"
  skip "make sure backend/.env points at a reachable PostgreSQL 16"
fi

# ─────────────────────────────────────────────────────────────
step "Installing dependencies"
# ─────────────────────────────────────────────────────────────
( cd backend  && npm install --no-audit --no-fund >/dev/null ) && ok "backend"
( cd frontend && npm install --no-audit --no-fund >/dev/null ) && ok "frontend"

if command -v flutter >/dev/null 2>&1; then
  ( cd mobile && flutter pub get >/dev/null 2>&1 ) && ok "mobile (Flutter)" \
    || warn "flutter pub get failed — the mobile app may need attention"
else
  skip "Flutter not installed — skipping the mobile app (that's fine for web development)"
fi

# ─────────────────────────────────────────────────────────────
step "Verifying"
# ─────────────────────────────────────────────────────────────
( cd backend && find src -name '*.js' -print0 | xargs -0 -n1 node --check ) \
  && ok "backend sources parse" \
  || die "backend has a syntax error"

if [ "$START_DB" -eq 1 ]; then
  set +e
  ( cd backend && npm run seed >/tmp/internalx-seed.log 2>&1 && npm run seed:dev >>/tmp/internalx-seed.log 2>&1 )
  SEED_RC=$?
  set -e
  if [ $SEED_RC -eq 0 ]; then
    ok "reference data + DEV-ONLY demo accounts seeded (never do this in production)"
  else
    warn "seed did not complete — the init SQL already seeds the core rows, so this is usually fine"
    skip "details: /tmp/internalx-seed.log"
  fi
fi

# ─────────────────────────────────────────────────────────────
printf '\n%s─────────────────────────────────────────────────────%s\n' "$DIM" "$NC"
printf '%s  Setup complete.%s\n' "$BOLD$GREEN" "$NC"
printf '%s─────────────────────────────────────────────────────%s\n\n' "$DIM" "$NC"

cat <<'EOF'
  Start the two servers in separate terminals:

    cd backend  && npm run dev     →  http://localhost:5000
    cd frontend && npm run dev     →  http://localhost:3000

  Then open http://localhost:3000. In development the sign-in page
  offers one-click logins for every access level, so you can see all
  nine dashboards without creating an account.

  Mobile (optional, needs Flutter 3.3+):

    cd mobile && flutter run --dart-define=API_URL=http://10.0.2.2:5000/api

  Useful:
    docker compose -f docker-compose.dev.yml logs -f postgres      database logs
    docker compose -f docker-compose.dev.yml down                  stop the database (data is kept)
    ./scripts/setup.sh --reset           wipe the database and start over

EOF
