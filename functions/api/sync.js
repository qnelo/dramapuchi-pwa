/**
 * Cloudflare Pages Function: /api/sync
 * Handles secure Google ID Token authentication, optimistic concurrency control (rev),
 * and state persistence in Cloudflare D1.
 */

let cachedCerts = null;
let certsExpiry = 0;

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function parseJwtParts(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const headerJson = new TextDecoder().decode(base64UrlDecode(parts[0]));
  const payloadJson = new TextDecoder().decode(base64UrlDecode(parts[1]));
  const header = JSON.parse(headerJson);
  const payload = JSON.parse(payloadJson);
  const signatureBytes = base64UrlDecode(parts[2]);
  const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  return { header, payload, signatureBytes, signedData };
}

async function getGooglePublicKeys() {
  const now = Date.now();
  if (cachedCerts && now < certsExpiry) {
    return cachedCerts;
  }
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
    headers: { 'User-Agent': 'DramaPuchi-Cloudflare-Sync' }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch Google public certificates');
  }
  const data = await res.json();
  cachedCerts = data.keys || [];
  // Cache for 1 hour or according to Cache-Control max-age
  certsExpiry = now + 3600000;
  return cachedCerts;
}

async function verifyGoogleIdToken(token, expectedClientId = null) {
  const { header, payload, signatureBytes, signedData } = parseJwtParts(token);

  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported JWT algorithm: ${header.alg}`);
  }

  // Verify expiration
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) {
    throw new Error('Google ID token is expired');
  }

  // Verify issuer
  const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];
  if (!validIssuers.includes(payload.iss)) {
    throw new Error(`Invalid token issuer: ${payload.iss}`);
  }

  // Verify audience if configured
  if (expectedClientId && payload.aud !== expectedClientId) {
    throw new Error(`Invalid audience: expected ${expectedClientId}, got ${payload.aud}`);
  }

  // Verify cryptographic signature with Google JWK
  const keys = await getGooglePublicKeys();
  const keyJwk = keys.find((k) => k.kid === header.kid);
  if (!keyJwk) {
    throw new Error(`Public key with kid ${header.kid} not found`);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    keyJwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureBytes,
    signedData
  );

  if (!isValid) {
    throw new Error('Google ID token cryptographic signature verification failed');
  }

  return {
    sub: payload.sub,
    email: payload.email || null,
    name: payload.name || null,
    picture: payload.picture || null
  };
}

function getBearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse({ error: 'Missing Bearer token' }, 401);
  }

  let user;
  try {
    user = await verifyGoogleIdToken(token, env.GOOGLE_CLIENT_ID);
  } catch (err) {
    return jsonResponse({ error: err.message }, 401);
  }

  const db = env.DB || env.dramapuchi_db;
  if (!db) {
    return jsonResponse({ error: 'D1 Database binding (DB) is missing' }, 500);
  }

  try {
    const row = await db.prepare(
      'SELECT state, rev, updated_at FROM user_saves WHERE sub = ?'
    ).bind(user.sub).first();

    if (!row) {
      return jsonResponse({ success: true, exists: false, user });
    }

    return jsonResponse({
      success: true,
      exists: true,
      state: JSON.parse(row.state),
      rev: Number(row.rev) || 1,
      updatedAt: Number(row.updated_at) || 0,
      user
    });
  } catch (err) {
    return jsonResponse({ error: 'Database read failed: ' + err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse({ error: 'Missing Bearer token' }, 401);
  }

  let user;
  try {
    user = await verifyGoogleIdToken(token, env.GOOGLE_CLIENT_ID);
  } catch (err) {
    return jsonResponse({ error: err.message }, 401);
  }

  const db = env.DB || env.dramapuchi_db;
  if (!db) {
    return jsonResponse({ error: 'D1 Database binding (DB) is missing' }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { state, clientRev, force } = payload;
  if (!state || typeof state !== 'object' || !state.stage || !state.bornTimestamp) {
    return jsonResponse({ error: 'Invalid pet state payload' }, 400);
  }

  // Ensure gen2Unlocked is strictly serialized
  state.gen2Unlocked = Boolean(state.gen2Unlocked);

  const stateJson = JSON.stringify(state);
  const now = Date.now();

  try {
    // Check if a record already exists
    const existing = await db.prepare(
      'SELECT rev, state, updated_at FROM user_saves WHERE sub = ?'
    ).bind(user.sub).first();

    if (existing) {
      // Permanent donor perks (gen2Unlocked, hasDonated) are cumulative and immutable
      try {
        const existingState = JSON.parse(existing.state || '{}');
        if (existingState.gen2Unlocked) {
          state.gen2Unlocked = true;
        }
        if (existingState.hasDonated) {
          state.hasDonated = true;
        }
      } catch {}
    }

    const stateJson = JSON.stringify(state);

    if (!existing) {
      // First save for this user
      await db.prepare(
        'INSERT INTO user_saves (sub, email, state, rev, updated_at) VALUES (?, ?, ?, 1, ?)'
      ).bind(user.sub, user.email, stateJson, now).run();

      return jsonResponse({ success: true, rev: 1, updatedAt: now });
    }

    const currentRev = Number(existing.rev) || 1;

    // Optimistic Concurrency Control check
    if (!force && clientRev !== undefined && clientRev !== null && Number(clientRev) !== currentRev) {
      // Revision mismatch -> 409 Conflict
      return jsonResponse({
        error: 'conflict',
        message: 'Cloud revision mismatch',
        cloudState: JSON.parse(existing.state),
        cloudRev: currentRev,
        cloudUpdatedAt: Number(existing.updated_at) || 0
      }, 409);
    }

    const nextRev = currentRev + 1;
    const updateRes = await db.prepare(
      'UPDATE user_saves SET state = ?, rev = ?, email = ?, updated_at = ? WHERE sub = ? AND (rev = ? OR ? = 1)'
    ).bind(stateJson, nextRev, user.email, now, user.sub, currentRev, force ? 1 : 0).run();

    if (updateRes.meta?.changes === 0 && !force) {
      // Concurrent update race condition occurred
      const fresh = await db.prepare(
        'SELECT rev, state, updated_at FROM user_saves WHERE sub = ?'
      ).bind(user.sub).first();

      return jsonResponse({
        error: 'conflict',
        message: 'Concurrent update detected',
        cloudState: fresh ? JSON.parse(fresh.state) : null,
        cloudRev: fresh ? Number(fresh.rev) : currentRev,
        cloudUpdatedAt: fresh ? Number(fresh.updated_at) : 0
      }, 409);
    }

    return jsonResponse({
      success: true,
      rev: nextRev,
      updatedAt: now
    });
  } catch (err) {
    return jsonResponse({ error: 'Database write failed: ' + err.message }, 500);
  }
}
