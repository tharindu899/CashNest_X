// CashNest X Cloudflare API upload entrypoint.
// This file mirrors src/index.js for manual/API upload references.

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
