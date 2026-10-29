/**
 * Cloudflare Pages Function: /api/verify-donation
 * Client-facing verification endpoint to securely claim and redeem a Ko-fi donation.
 * Supports:
 * 1. Session Donor Code (#DP-XXXX)
 * 2. Secret Ko-fi Transaction ID from private email receipt
 * 3. Logged-in Google email match (strictly verified via JWT)
 * Guarantees single-use (anti-fraud protection).
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

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

function parseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = new TextDecoder().decode(base64UrlDecode(parts[1]));
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const db = env.DB || env.dramapuchi_db;
  if (!db) {
    return jsonResponse({ error: 'Database binding (DB) missing' }, 500);
  }

  // Ensure tables exist
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS donations (
        id TEXT PRIMARY KEY,
        email TEXT,
        amount TEXT,
        currency TEXT,
        from_name TEXT,
        message TEXT,
        donor_code TEXT,
        claimed_by_sub TEXT,
        claimed INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `).run();
  } catch {}

  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const rawDonorCode = (body.donorCode || '').trim().toUpperCase();
  const rawTxId = (body.transactionId || '').trim();
  const rawEmail = (body.email || '').trim().toLowerCase();

  // Optional: Extract logged-in Google user if token is supplied
  const authHeader = request.headers.get('Authorization') || '';
  let authUser = null;
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const payload = parseJwtPayload(token);
    if (payload && payload.sub) {
      authUser = {
        sub: payload.sub,
        email: (payload.email || '').toLowerCase()
      };
    }
  }

  // Query donations table
  let donation = null;

  try {
    // 1. Search by donor code (#DP-XXXX)
    if (rawDonorCode) {
      donation = await db.prepare(
        'SELECT * FROM donations WHERE donor_code = ?'
      ).bind(rawDonorCode).first();
    }

    // 2. Search by secret Ko-fi Transaction ID
    if (!donation && rawTxId) {
      donation = await db.prepare(
        'SELECT * FROM donations WHERE id = ?'
      ).bind(rawTxId).first();
    }

    // 3. Search by authenticated Google email (ONLY if the logged-in token email matches)
    if (!donation && authUser && authUser.email) {
      donation = await db.prepare(
        'SELECT * FROM donations WHERE lower(email) = ?'
      ).bind(authUser.email).first();
    }

    // 4. Fallback search by input email ONLY if it matches the authenticated user's email
    if (!donation && rawEmail && authUser && authUser.email === rawEmail) {
      donation = await db.prepare(
        'SELECT * FROM donations WHERE lower(email) = ?'
      ).bind(rawEmail).first();
    }
  } catch (err) {
    return jsonResponse({ error: 'Database search error: ' + err.message }, 500);
  }

  if (!donation) {
    return jsonResponse({
      success: false,
      error: 'not_found',
      message: 'No unverified donation found matching these details'
    }, 404);
  }

  // Anti-fraud check: is this donation already claimed by another user?
  const isClaimed = Number(donation.claimed) === 1;
  const claimedBy = donation.claimed_by_sub;

  if (isClaimed) {
    if (authUser && claimedBy && claimedBy === authUser.sub) {
      // User is already the owner of this claimed donation
      return jsonResponse({
        success: true,
        verified: true,
        gen2Unlocked: true,
        amount: donation.amount,
        alreadyClaimed: true
      });
    }

    // Attempting to claim a donation already taken by someone else
    return jsonResponse({
      success: false,
      error: 'already_claimed',
      message: 'This donation has already been claimed by another account'
    }, 409);
  }

  // Claim the donation
  const now = Date.now();
  const subToBind = authUser ? authUser.sub : null;

  try {
    await db.prepare(
      'UPDATE donations SET claimed = 1, claimed_by_sub = ? WHERE id = ?'
    ).bind(subToBind, donation.id).run();

    // If user is logged in, unlock Gen 2 in user_saves in D1 immediately
    if (authUser) {
      const user = await db.prepare('SELECT state FROM user_saves WHERE sub = ?').bind(authUser.sub).first();
      if (user) {
        let userState = {};
        try { userState = JSON.parse(user.state); } catch {}
        userState.gen2Unlocked = true;
        userState.hasDonated = true;

        await db.prepare(
          'UPDATE user_saves SET state = ?, rev = rev + 1, updated_at = ? WHERE sub = ?'
        ).bind(JSON.stringify(userState), now, authUser.sub).run();
      }
    }
  } catch (err) {
    return jsonResponse({ error: 'Failed to claim donation: ' + err.message }, 500);
  }

  return jsonResponse({
    success: true,
    verified: true,
    gen2Unlocked: true,
    amount: donation.amount,
    currency: donation.currency
  });
}
