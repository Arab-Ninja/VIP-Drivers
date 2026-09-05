#!/usr/bin/env bash
# Prepares a throwaway local environment so the app can be run and tested
# immediately in a fresh checkout or a cloud dev session.
#
# Safe to re-run. Does nothing destructive to an existing setup: if
# .env.local already names a DATABASE_URL, that database is left alone.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 0

log() { printf '  %s\n' "$*"; }

# --- dependencies -----------------------------------------------------------
if [ ! -d node_modules ]; then
  log "installing dependencies…"
  npm install --no-audit --no-fund >/dev/null 2>&1 || log "npm install failed"
fi

# --- environment ------------------------------------------------------------
if [ -f .env.local ] && grep -q '^DATABASE_URL=' .env.local; then
  log ".env.local already configured, leaving it as is"
  exit 0
fi

PG_BIN=""
for dir in /usr/lib/postgresql/*/bin; do
  [ -x "$dir/initdb" ] && PG_BIN="$dir"
done

if [ -z "$PG_BIN" ]; then
  log "no local PostgreSQL found — set DATABASE_URL in .env.local yourself"
  exit 0
fi

PGDATA=/tmp/pgdata-vip
PORT=5433

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  log "initialising PostgreSQL in $PGDATA…"
  rm -rf "$PGDATA"; mkdir -p "$PGDATA"
  # initdb refuses to run as root, so it runs as the postgres system user.
  chown postgres:postgres "$PGDATA" 2>/dev/null || true
  chmod 700 "$PGDATA"
  su postgres -c "$PG_BIN/initdb -D $PGDATA -U vip --auth=trust" >/dev/null 2>&1 \
    || "$PG_BIN/initdb" -D "$PGDATA" -U vip --auth=trust >/dev/null 2>&1 \
    || { log "initdb failed"; exit 0; }
fi

if ! pg_isready -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1; then
  log "starting PostgreSQL on port $PORT…"
  su postgres -c "$PG_BIN/pg_ctl -D $PGDATA -o '-p $PORT -h 127.0.0.1' -l /tmp/pg-vip.log start" >/dev/null 2>&1 \
    || "$PG_BIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -h 127.0.0.1" -l /tmp/pg-vip.log start >/dev/null 2>&1
  for _ in $(seq 1 20); do
    pg_isready -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1 && break
    sleep 0.5
  done
fi

psql -h 127.0.0.1 -p "$PORT" -U vip -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='vipdrivers'" 2>/dev/null | grep -q 1 \
  || psql -h 127.0.0.1 -p "$PORT" -U vip -d postgres -c "CREATE DATABASE vipdrivers" >/dev/null 2>&1

cat > .env.local <<ENVEOF
# Written by scripts/dev-setup.sh for local development only.
DATABASE_URL="postgresql://vip@127.0.0.1:$PORT/vipdrivers"
AUTH_SECRET="local-development-secret-not-for-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ADMIN_EMAILS="admin@vipdrivers.be"
DEMO_PAYMENTS="true"
ENVEOF

log "applying migrations…"
npx drizzle-kit migrate >/dev/null 2>&1 || log "migration failed"

log "seeding fleet, settings and demo accounts…"
npx tsx src/db/seed.ts --demo >/dev/null 2>&1 || log "seed failed"

log "ready — npm run dev, then sign in as admin@vipdrivers.be / VipDrivers2026!"
