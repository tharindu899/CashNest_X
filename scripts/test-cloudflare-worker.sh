#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$PROJECT_ROOT/.env.cloudflare.worker}"

log() { printf '\033[1;36m%s\033[0m\n' "➜ $*" >&2; }
success() { printf '\033[1;32m%s\033[0m\n' "✅ $*" >&2; }
fail() { printf '\033[1;31m%s\033[0m\n' "❌ $*" >&2; exit 1; }

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  . "$ENV_FILE"
  set +a
else
  log "Env file not found: $ENV_FILE"
  log "You can also export WORKER_URL, BACKUP_KEY, and FIREBASE_ID_TOKEN manually."
fi

WORKER_URL="${WORKER_URL:-${VITE_CLOUDFLARE_WORKER_URL:-}}"
BACKUP_KEY="${BACKUP_KEY:-${VITE_CLOUDFLARE_BACKUP_KEY:-${CASHNEST_BACKUP_KEY:-}}}"
FIREBASE_ID_TOKEN="${FIREBASE_ID_TOKEN:-${FIREBASE_AUTH_TOKEN:-}}"

[ -n "$WORKER_URL" ] || fail "Missing WORKER_URL or VITE_CLOUDFLARE_WORKER_URL."
[ -n "$BACKUP_KEY" ] || fail "Missing BACKUP_KEY, VITE_CLOUDFLARE_BACKUP_KEY, or CASHNEST_BACKUP_KEY."
[ -n "$FIREBASE_ID_TOKEN" ] || fail "Missing FIREBASE_ID_TOKEN. Login with Firebase Google first and paste a current Firebase ID token for manual Worker backup testing."

WORKER_URL="${WORKER_URL%/}"

log "Checking Worker health"
curl -fsS "$WORKER_URL/health" | jq . >/dev/null
success "Health endpoint works"

log "Saving user-scoped test backup"
curl -fsS -X PUT "$WORKER_URL/backup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "X-CashNest-Backup-Key: $BACKUP_KEY" \
  --data '{"ok":true,"source":"cashnest-x-firebase-kv-test"}' | jq . >/dev/null
success "Backup PUT works"

log "Reading user-scoped test backup"
curl -fsS "$WORKER_URL/backup" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "X-CashNest-Backup-Key: $BACKUP_KEY" | jq . >/dev/null
success "Backup GET works"

success "Firebase-authenticated Cloudflare Worker KV test finished"
