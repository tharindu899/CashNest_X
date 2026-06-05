#!/usr/bin/env bash
set -euo pipefail

APP_NAME="CashNest X"
DEFAULT_WORKER_NAME="cashnest-x-backup-api"
DEFAULT_KV_NAMESPACE="cashnest-x-backups"
DEFAULT_WORKERS_SUBDOMAIN="your-name"
DEFAULT_COMPATIBILITY_DATE="2026-06-05"
API_BASE="https://api.cloudflare.com/client/v4"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="$PROJECT_ROOT/cloudflare-worker"
WORKER_SRC="$WORKER_DIR/src/index.js"
WRANGLER_FILE="$WORKER_DIR/wrangler.toml"
ENV_FILE="$PROJECT_ROOT/.env.cloudflare.worker"

log() { printf '\033[1;36m%s\033[0m\n' "➜ $*" >&2; }
success() { printf '\033[1;32m%s\033[0m\n' "✅ $*" >&2; }
warn() { printf '\033[1;33m%s\033[0m\n' "⚠️  $*" >&2; }
fail() { printf '\033[1;31m%s\033[0m\n' "❌ $*" >&2; exit 1; }

is_tty() { [ -t 0 ]; }

ask_default() {
  local prompt="$1"
  local default="$2"
  local value=""
  if is_tty; then
    printf '%s [%s]: ' "$prompt" "$default" >&2
    read -r value || true
  fi
  printf '%s' "${value:-$default}"
}

ask_secret() {
  local prompt="$1"
  local value=""
  if is_tty; then
    printf '%s: ' "$prompt" >&2
    read -r -s value || true
    printf '\n' >&2
  fi
  printf '%s' "$value"
}

require_dash_name() {
  local label="$1"
  local value="$2"
  if [[ ! "$value" =~ ^[a-z0-9-]+$ ]]; then
    fail "$label must contain only lowercase letters, numbers, and dashes. Bad value: $value"
  fi
  if [[ "$value" == -* || "$value" == *- ]]; then
    fail "$label cannot start or end with a dash. Bad value: $value"
  fi
}

require_worker_dns_name() {
  local value="$1"
  require_dash_name "Worker name" "$value"
  if [ "${#value}" -gt 63 ]; then
    fail "Worker name must be 63 characters or less when using workers.dev. Bad value length: ${#value}"
  fi
}

generate_key() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v python >/dev/null 2>&1; then
    python - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
  elif command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
  else
    date +%s%N | sha256sum | awk '{print $1}'
  fi
}

install_termux_deps() {
  if command -v pkg >/dev/null 2>&1; then
    log "Installing Termux packages: curl jq openssl-tool"
    pkg update -y
    pkg install -y curl jq openssl-tool
  else
    warn "Termux pkg command not found. Skipping package install. Make sure curl, jq, and openssl are installed."
  fi
}

require_tools() {
  command -v curl >/dev/null 2>&1 || fail "curl is missing. In Termux run: pkg install curl"
  command -v jq >/dev/null 2>&1 || fail "jq is missing. In Termux run: pkg install jq"
}

normalize_token() {
  # Fix common copy/paste mistakes: extra spaces, quotes, CRLF, or "Bearer " prefix.
  printf '%s' "$1" \
    | tr -d '\r\n\t ' \
    | sed -e 's/^Bearer//' -e 's/^bearer//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

print_auth_fix_guide() {
  warn "Cloudflare authentication failed before the API action could continue."
  warn "Fix checklist:"
  warn "1) Use a Cloudflare API Token, not Global API Key and not R2 S3 Access Key."
  warn "2) Copy only the token value. Do not include the word Bearer."
  warn "3) Token permissions must include:"
  warn "   - Account → Workers Scripts → Edit"
  warn "   - Account → Workers KV Storage → Edit"
  warn "   - Account → Account Settings → Read"
  warn "4) Account Resources must include the same Cloudflare account you are deploying to."
  warn "5) Remove Client IP filtering / TTL restrictions while testing from Termux."
  warn "6) Test the token manually:"
  warn '   curl "https://api.cloudflare.com/client/v4/user/tokens/verify" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq'
}

verify_cloudflare_token() {
  log "Verifying Cloudflare API token"
  local response status
  response="$(cf_api_json GET "/user/tokens/verify")"

  if cf_is_success "$response"; then
    status="$(echo "$response" | jq -r '.result.status // "unknown"')"
    if [ "$status" = "active" ]; then
      success "Cloudflare API token is valid and active"
      return 0
    fi
    warn "Token verified, but status is: $status"
  else
    warn "Token verify failed. Cloudflare response:"
    cf_error_text "$response" >&2 || true
    print_auth_fix_guide
    fail "Cloudflare API token verify failed"
  fi
}

cf_is_json() {
  local response="$1"
  echo "$response" | jq -e . >/dev/null 2>&1
}

cf_is_cloudflare_transient_html() {
  local response="$1"
  ! cf_is_json "$response" && echo "$response" | grep -Eqi 'api\.cloudflare\.com|Cloudflare|SSL handshake failed|Error code 52[0-9]|code 52[0-9]|<html|<!DOCTYPE html'
}

cf_retry_sleep() {
  local attempt="$1"
  local delay=$((attempt * 4))
  warn "Cloudflare API returned a temporary HTML/5xx response. Retrying in ${delay}s..."
  sleep "$delay"
}

cf_api_json() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  local response=""
  local attempt=""

  for attempt in 1 2 3 4 5; do
    if [ -n "$data" ]; then
      response="$(curl -sS --connect-timeout 30 --max-time 120 -X "$method" "$API_BASE$path" \
        -H 'Content-Type: application/json' \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        --data "$data" || true)"
    else
      response="$(curl -sS --connect-timeout 30 --max-time 120 -X "$method" "$API_BASE$path" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" || true)"
    fi

    if cf_is_json "$response" || ! cf_is_cloudflare_transient_html "$response" || [ "$attempt" = "5" ]; then
      printf '%s' "$response"
      return
    fi

    cf_retry_sleep "$attempt"
  done
}

cf_error_text() {
  local response="$1"
  if echo "$response" | jq -e . >/dev/null 2>&1; then
    echo "$response" | jq -r '.errors[]? | "- [" + (.code|tostring) + "] " + .message' | sed '/^$/d'
  else
    printf '%s\n' "$response"
  fi
}

cf_is_success() {
  local response="$1"
  cf_is_json "$response" && echo "$response" | jq -e '.success == true' >/dev/null 2>&1
}

cf_check() {
  local response="$1"
  local action="$2"
  if cf_is_success "$response"; then
    return 0
  fi

  warn "$action failed. Cloudflare response:"
  cf_error_text "$response" >&2

  if cf_is_cloudflare_transient_html "$response"; then
    warn "Cloudflare returned its own temporary HTML/5xx page instead of JSON."
    warn "This usually means the Cloudflare API gateway had a temporary SSL/edge problem, not that your Worker code is broken."
  fi

  if cf_is_json "$response" && echo "$response" | jq -e '.errors[]? | select(.code == 10000)' >/dev/null 2>&1; then
    print_auth_fix_guide
  fi

  if cf_is_json "$response" && echo "$response" | jq -e '.errors[]? | select(.code == 10063)' >/dev/null 2>&1; then
    warn "Your Cloudflare account does not have workers.dev initialized yet."
    warn "Open Cloudflare Dashboard → Workers & Pages once, set your workers.dev subdomain, then run this script again."
  fi

  fail "$action failed"
}

write_worker_files() {
  mkdir -p "$WORKER_DIR/src"

  cat > "$WORKER_SRC" <<'WORKER_JS'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CashNest-Backup-Key'
};

const MAX_BACKUP_BYTES = 24 * 1024 * 1024;
const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let firebaseJwkCache = null;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        ok: true,
        app: 'CashNest X Backup Worker',
        auth: 'Firebase Google login',
        storage: 'Cloudflare Workers KV',
        userScoped: true
      });
    }

    if (url.pathname !== '/backup') {
      return json({ error: 'Not found' }, 404);
    }

    const requestKey = request.headers.get('X-CashNest-Backup-Key') || '';
    const expectedKey = env.CASHNEST_BACKUP_KEY || '';

    if (!expectedKey || requestKey !== expectedKey) {
      return json({ error: 'Unauthorized app key' }, 401);
    }

    if (!env.FIREBASE_PROJECT_ID) {
      return json({ error: 'Worker missing FIREBASE_PROJECT_ID secret/variable' }, 500);
    }

    if (!env.BACKUP_KV) {
      return json({ error: 'KV namespace binding BACKUP_KV is missing' }, 500);
    }

    let firebaseUser;
    try {
      firebaseUser = await verifyFirebaseUser(request, env.FIREBASE_PROJECT_ID);
    } catch (error) {
      return json({ error: error?.message || 'Invalid Firebase login' }, 401);
    }

    const backupKey = `cashnest_x:user:${firebaseUser.uid}`;

    if (request.method === 'PUT') {
      const body = await request.text();
      if (!body) return json({ error: 'Backup body is empty' }, 400);
      if (new TextEncoder().encode(body).byteLength > MAX_BACKUP_BYTES) {
        return json({ error: 'Backup is too large for Workers KV. Keep one backup under 25 MiB.' }, 413);
      }

      const savedAt = new Date().toISOString();
      await env.BACKUP_KV.put(backupKey, body, {
        metadata: {
          app: 'CashNest X',
          storage: 'Cloudflare Workers KV',
          auth: 'Firebase',
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          updatedAt: savedAt
        }
      });

      return json({
        ok: true,
        savedAt,
        storage: 'Cloudflare Workers KV',
        userScoped: true,
        uid: firebaseUser.uid,
        key: backupKey
      });
    }

    if (request.method === 'GET') {
      const value = await env.BACKUP_KV.get(backupKey);
      if (!value) return json({ error: 'No backup found' }, 404);

      return new Response(value, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      });
    }

    return json({ error: 'Method not allowed' }, 405);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json'
    }
  });
}

async function verifyFirebaseUser(request, projectId) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) throw new Error('Missing Firebase Authorization bearer token');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid Firebase token format');

  const header = decodeJwtJson(parts[0]);
  const payload = decodeJwtJson(parts[1]);

  if (header.alg !== 'RS256') throw new Error('Invalid Firebase token algorithm');
  if (!header.kid) throw new Error('Firebase token missing key id');
  if (payload.aud !== projectId) throw new Error('Firebase token audience does not match this Worker project');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Firebase token issuer does not match this Worker project');
  if (!payload.sub || String(payload.sub).length > 128) throw new Error('Firebase token subject is invalid');

  const now = Math.floor(Date.now() / 1000);
  if (Number(payload.exp || 0) <= now) throw new Error('Firebase token expired');
  if (Number(payload.iat || 0) > now + 300) throw new Error('Firebase token issued in the future');

  const jwk = await getFirebaseJwk(header.kid);
  if (!jwk) throw new Error('Firebase signing key not found. Try again later.');

  const valid = await verifyRs256(`${parts[0]}.${parts[1]}`, parts[2], jwk);
  if (!valid) throw new Error('Firebase token signature is invalid');

  return {
    uid: String(payload.sub),
    email: payload.email || '',
    name: payload.name || ''
  };
}

async function getFirebaseJwk(kid) {
  const now = Date.now();
  if (firebaseJwkCache && firebaseJwkCache.expiresAt > now) return firebaseJwkCache.keys[kid] || null;

  const response = await fetch(FIREBASE_JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!response.ok) throw new Error('Could not load Firebase public keys');

  const body = await response.json();
  const keys = Array.isArray(body?.keys) ? body.keys : [];
  const keyMap = Object.fromEntries(keys.filter((key) => key?.kid).map((key) => [key.kid, key]));
  const cacheControl = response.headers.get('Cache-Control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  firebaseJwkCache = {
    keys: keyMap,
    expiresAt: now + Math.max(300, maxAgeSeconds - 60) * 1000
  };

  return keyMap[kid] || null;
}

function decodeJwtJson(part) {
  const json = new TextDecoder().decode(base64UrlToBytes(part));
  return JSON.parse(json);
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyRs256(signingInput, signaturePart, jwk) {
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      ...jwk,
      alg: 'RS256',
      ext: true,
      key_ops: ['verify']
    },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(signaturePart),
    new TextEncoder().encode(signingInput)
  );
}

WORKER_JS

  # Keep a visible worker.js upload entrypoint in the repo for manual/API references.
  {
    printf '%s\n' '// CashNest X Cloudflare API upload entrypoint.'
    printf '%s\n' '// This file mirrors src/index.js for manual/API upload references.'
    printf '\n'
    cat "$WORKER_SRC"
  } > "$WORKER_DIR/worker.js"


  cat > "$WORKER_DIR/package.json" <<'PACKAGE_JSON'
{
  "name": "cashnest-x-backup-worker",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "check": "node --check src/index.js"
  },
  "description": "CashNest X Firebase-authenticated Cloudflare Worker source. Termux deploy uses scripts/deploy-cloudflare-worker-termux.sh with curl + Cloudflare REST API and Workers KV. No Wrangler, no workerd, no R2."
}
PACKAGE_JSON
}

detect_account_id() {
  local account_id="${CLOUDFLARE_ACCOUNT_ID:-${ACCOUNT_ID:-}}"
  if [ -n "$account_id" ]; then
    printf '%s' "$account_id"
    return
  fi

  log "Detecting Cloudflare account ID from API token"
  local response
  response="$(cf_api_json GET "/accounts?per_page=5")"

  if cf_is_success "$response"; then
    local count
    count="$(echo "$response" | jq '.result | length')"
    if [ "$count" = "1" ]; then
      echo "$response" | jq -r '.result[0].id'
      return
    fi

    if [ "$count" -gt 1 ]; then
      warn "More than one Cloudflare account found. Choose the correct Account ID:"
      echo "$response" | jq -r '.result[] | "- " + .name + "  " + .id' >&2
    fi
  else
    warn "Could not auto-detect account ID with this token."
    cf_error_text "$response" >&2 || true
    if echo "$response" | jq -e '.errors[]? | select(.code == 10000)' >/dev/null 2>&1; then
      print_auth_fix_guide
      fail "Cloudflare authentication failed while detecting account ID"
    fi
  fi

  account_id="$(ask_default "Cloudflare Account ID" "paste-account-id")"
  [ "$account_id" != "paste-account-id" ] || fail "Set CLOUDFLARE_ACCOUNT_ID or paste your real Cloudflare Account ID."
  printf '%s' "$account_id"
}

ensure_kv_namespace() {
  local account_id="$1"
  local namespace_title="$2"

  log "Checking Workers KV namespace: $namespace_title"
  local list_response namespace_id create_response payload
  list_response="$(cf_api_json GET "/accounts/$account_id/storage/kv/namespaces?per_page=100")"

  if cf_is_success "$list_response"; then
    namespace_id="$(echo "$list_response" | jq -r --arg title "$namespace_title" '.result[]? | select(.title == $title) | .id' | head -n 1)"
    if [ -n "$namespace_id" ]; then
      success "Workers KV namespace already exists: $namespace_title"
      printf '%s' "$namespace_id"
      return
    fi
  else
    cf_check "$list_response" "List Workers KV namespaces"
  fi

  log "Creating Workers KV namespace: $namespace_title"
  payload="$(jq -n --arg title "$namespace_title" '{title:$title}')"
  create_response="$(cf_api_json POST "/accounts/$account_id/storage/kv/namespaces" "$payload")"

  if cf_is_success "$create_response"; then
    namespace_id="$(echo "$create_response" | jq -r '.result.id')"
    success "Workers KV namespace created: $namespace_title"
    printf '%s' "$namespace_id"
    return
  fi

  if echo "$create_response" | grep -qi 'already\|exist'; then
    warn "Namespace may already exist. Rechecking."
    list_response="$(cf_api_json GET "/accounts/$account_id/storage/kv/namespaces?per_page=100")"
    namespace_id="$(echo "$list_response" | jq -r --arg title "$namespace_title" '.result[]? | select(.title == $title) | .id' | head -n 1)"
    [ -n "$namespace_id" ] && { printf '%s' "$namespace_id"; return; }
  fi

  cf_check "$create_response" "Create Workers KV namespace"
}

upload_worker() {
  local account_id="$1"
  local worker_name="$2"
  local namespace_id="$3"
  local compatibility_date="$4"

  local metadata_file module_dir module_file
  metadata_file="$(mktemp)"
  module_dir="$(mktemp -d)"
  module_file="$module_dir/worker.js"

  # Cloudflare requires metadata.main_module to match the uploaded module part.
  # Termux/curl can otherwise send the source filename as index.js, so copy it to
  # a real worker.js file and force filename=worker.js in the multipart request.
  cp "$WORKER_SRC" "$module_file"

  jq -n \
    --arg main "worker.js" \
    --arg compatibility_date "$compatibility_date" \
    --arg namespace_id "$namespace_id" \
    '{
      main_module: $main,
      compatibility_date: $compatibility_date,
      bindings: [
        {
          type: "kv_namespace",
          name: "BACKUP_KV",
          namespace_id: $namespace_id
        }
      ]
    }' > "$metadata_file"

  log "Uploading Worker module with Workers KV binding: $worker_name"
  local response=""
  local attempt=""
  for attempt in 1 2 3 4 5; do
    response="$(curl -sS --connect-timeout 30 --max-time 180 -X PUT "$API_BASE/accounts/$account_id/workers/scripts/$worker_name" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -F "metadata=<$metadata_file;type=application/json" \
      -F "worker.js=@$module_file;filename=worker.js;type=application/javascript+module" || true)"

    if cf_is_json "$response" || ! cf_is_cloudflare_transient_html "$response" || [ "$attempt" = "5" ]; then
      break
    fi

    cf_retry_sleep "$attempt"
  done

  rm -f "$metadata_file"
  rm -rf "$module_dir"

  if ! cf_is_success "$response" && cf_is_json "$response" && echo "$response" | jq -e '.errors[]? | select(.code == 10021)' >/dev/null 2>&1; then
    warn "Cloudflare returned 10021. This usually means main_module did not match the uploaded multipart module name."
    warn "This script now uploads a real worker.js part with filename=worker.js. If it still fails, update curl in Termux: pkg upgrade curl."
  fi

  cf_check "$response" "Upload Worker module"
  success "Worker uploaded: $worker_name"
}

put_worker_secret_value() {
  local account_id="$1"
  local worker_name="$2"
  local secret_name="$3"
  local secret_value="$4"

  log "Uploading Worker secret: $secret_name"
  local payload response
  payload="$(jq -n --arg name "$secret_name" --arg text "$secret_value" '{name:$name, text:$text, type:"secret_text"}')"
  response="$(cf_api_json PUT "/accounts/$account_id/workers/scripts/$worker_name/secrets" "$payload")"
  cf_check "$response" "Upload Worker secret $secret_name"
  success "Worker secret saved: $secret_name"
}

put_worker_secrets() {
  local account_id="$1"
  local worker_name="$2"
  local backup_key="$3"
  local firebase_project_id="$4"

  put_worker_secret_value "$account_id" "$worker_name" "CASHNEST_BACKUP_KEY" "$backup_key"
  put_worker_secret_value "$account_id" "$worker_name" "FIREBASE_PROJECT_ID" "$firebase_project_id"
}

enable_workers_dev() {
  local account_id="$1"
  local worker_name="$2"

  log "Enabling workers.dev route for Worker"
  local payload response
  payload='{"enabled":true,"previews_enabled":true}'
  response="$(cf_api_json POST "/accounts/$account_id/workers/scripts/$worker_name/subdomain" "$payload")"

  if cf_is_success "$response"; then
    success "workers.dev route enabled"
    return 0
  fi

  if cf_is_cloudflare_transient_html "$response"; then
    warn "Cloudflare returned an HTML 5xx page while enabling workers.dev."
    warn "KV namespace, Worker upload, and Worker secret are already finished."
    warn "Run this script again later, or enable manually: Cloudflare Dashboard → Workers & Pages → $worker_name → Settings → Domains & Routes → workers.dev → Enable."
    warn "Continuing so .env.cloudflare.worker is still written. Test the URL after enabling workers.dev."
    return 0
  fi

  cf_check "$response" "Enable workers.dev route"
  success "workers.dev route enabled"
}

write_helper_files() {
  local account_id="$1"
  local worker_name="$2"
  local namespace_title="$3"
  local namespace_id="$4"
  local backup_key="$5"
  local firebase_project_id="$6"
  local workers_subdomain="$7"
  local compatibility_date="$8"

  cat > "$WRANGLER_FILE" <<EOF_TOML
# Optional desktop/PC Wrangler config.
# The Termux deploy script uses curl + Cloudflare REST API and does not run Wrangler.
name = "$worker_name"
main = "src/index.js"
compatibility_date = "$compatibility_date"
workers_dev = true

[[kv_namespaces]]
binding = "BACKUP_KV"
id = "$namespace_id"
EOF_TOML

  cat > "$ENV_FILE" <<EOF_ENV
# CashNest X Cloudflare Worker values
# Add these VITE_ values to your app .env or GitHub Actions secrets.
VITE_CLOUDFLARE_WORKER_URL=https://$worker_name.$workers_subdomain.workers.dev
VITE_CLOUDFLARE_BACKUP_KEY=$backup_key
VITE_FIREBASE_PROJECT_ID=$firebase_project_id

# Used by this deploy script and Worker secret upload.
CLOUDFLARE_ACCOUNT_ID=$account_id
WORKER_NAME=$worker_name
KV_NAMESPACE=$namespace_title
KV_NAMESPACE_ID=$namespace_id
WORKERS_SUBDOMAIN=$workers_subdomain
CASHNEST_BACKUP_KEY=$backup_key
FIREBASE_PROJECT_ID=$firebase_project_id
EOF_ENV
}

main() {
  printf '\n🪺 %s — Termux Cloudflare Worker KV deploy\n' "$APP_NAME"
  printf 'No local Wrangler install. No workerd. No R2 billing setup. Uses curl + Cloudflare REST API + Workers KV.\n\n'

  install_termux_deps
  require_tools

  local token="${CLOUDFLARE_API_TOKEN:-}"
  if [ -z "$token" ]; then
    warn "CLOUDFLARE_API_TOKEN is not set."
    warn "Create a token with Account → Workers Scripts → Edit, Account → Workers KV Storage → Edit, and Account Settings → Read."
    token="$(ask_secret "Paste Cloudflare API token")"
    [ -n "$token" ] || fail "Cloudflare API token is required."
  fi
  token="$(normalize_token "$token")"
  [ -n "$token" ] || fail "Cloudflare API token is empty after cleanup. Paste only the token value."
  export CLOUDFLARE_API_TOKEN="$token"
  verify_cloudflare_token

  local worker_name="${WORKER_NAME:-}"
  local kv_namespace="${KV_NAMESPACE:-${KV_NAMESPACE_TITLE:-}}"
  local backup_key="${CASHNEST_BACKUP_KEY:-}"
  local firebase_project_id="${FIREBASE_PROJECT_ID:-${VITE_FIREBASE_PROJECT_ID:-}}"
  local workers_subdomain="${WORKERS_SUBDOMAIN:-}"
  local compatibility_date="${COMPATIBILITY_DATE:-$DEFAULT_COMPATIBILITY_DATE}"

  worker_name="${worker_name:-$(ask_default "Worker name" "$DEFAULT_WORKER_NAME")}" 
  kv_namespace="${kv_namespace:-$(ask_default "Workers KV namespace" "$DEFAULT_KV_NAMESPACE")}" 
  workers_subdomain="${workers_subdomain:-$(ask_default "workers.dev account subdomain" "$DEFAULT_WORKERS_SUBDOMAIN")}" 
  firebase_project_id="${firebase_project_id:-$(ask_default "Firebase Project ID" "paste-firebase-project-id")}"

  [ "$firebase_project_id" != "paste-firebase-project-id" ] || fail "Set FIREBASE_PROJECT_ID / VITE_FIREBASE_PROJECT_ID or paste your real Firebase Project ID."
  [ -n "$firebase_project_id" ] || fail "Firebase Project ID is required for per-user Firebase token verification."

  require_worker_dns_name "$worker_name"
  require_dash_name "Workers KV namespace" "$kv_namespace"
  if [ "$workers_subdomain" != "$DEFAULT_WORKERS_SUBDOMAIN" ]; then
    require_dash_name "workers.dev account subdomain" "$workers_subdomain"
  fi

  if [ -z "$backup_key" ]; then
    backup_key="$(generate_key)"
    warn "Generated a new backup key. Save it safely."
  fi

  write_worker_files

  local account_id namespace_id
  account_id="$(detect_account_id)"
  [ -n "$account_id" ] || fail "Cloudflare Account ID is required."

  namespace_id="$(ensure_kv_namespace "$account_id" "$kv_namespace")"
  [ -n "$namespace_id" ] || fail "Workers KV namespace ID is required."

  upload_worker "$account_id" "$worker_name" "$namespace_id" "$compatibility_date"
  put_worker_secrets "$account_id" "$worker_name" "$backup_key" "$firebase_project_id"
  enable_workers_dev "$account_id" "$worker_name"
  write_helper_files "$account_id" "$worker_name" "$kv_namespace" "$namespace_id" "$backup_key" "$firebase_project_id" "$workers_subdomain" "$compatibility_date"

  success "Cloudflare Worker KV deploy finished"
  printf '\n📌 App env values:\n'
  printf 'VITE_CLOUDFLARE_WORKER_URL=https://%s.%s.workers.dev\n' "$worker_name" "$workers_subdomain"
  printf 'VITE_CLOUDFLARE_BACKUP_KEY=%s\n' "$backup_key"
  printf 'VITE_FIREBASE_PROJECT_ID=%s\n' "$firebase_project_id"
  printf '\n📄 Saved local helper file: %s\n' "$ENV_FILE"
  printf '\n🧪 Test:\n'
  printf 'WORKER_URL="https://%s.%s.workers.dev"\n' "$worker_name" "$workers_subdomain"
  printf 'BACKUP_KEY="%s"\n' "$backup_key"
  printf 'FIREBASE_ID_TOKEN="paste-current-Firebase-ID-token"\n'
  printf 'curl -i "$WORKER_URL/health"\n'
  printf 'curl -i -X PUT "$WORKER_URL/backup" -H "Content-Type: application/json" -H "Authorization: Bearer $FIREBASE_ID_TOKEN" -H "X-CashNest-Backup-Key: $BACKUP_KEY" --data "{\\"ok\\":true}"\n'
  printf 'curl -i "$WORKER_URL/backup" -H "Authorization: Bearer $FIREBASE_ID_TOKEN" -H "X-CashNest-Backup-Key: $BACKUP_KEY"\n'

  if [ "$workers_subdomain" = "$DEFAULT_WORKERS_SUBDOMAIN" ]; then
    warn "Replace your-name with your real workers.dev account subdomain in .env.cloudflare.worker."
  fi
}

main "$@"
