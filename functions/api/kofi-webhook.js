/**
 * Cloudflare Pages Function: /api/kofi-webhook
 * Receives incoming HTTP POST webhook notifications from Ko-fi upon verified donation.
 * Validates verification_token, stores donation in D1, and automatically activates Gen 2.
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Parse Ko-fi form-encoded payload containing 'data' parameter
  let rawData = null;
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      rawData = formData.get('data');
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      rawData = typeof body.data === 'string' ? body.data : JSON.stringify(body);
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      rawData = params.get('data') || text;
    }
  } catch (err) {
    return jsonResponse({ error: 'Failed to parse request body: ' + err.message }, 400);
  }

  if (!rawData) {
    return jsonResponse({ error: 'Missing Ko-fi data parameter' }, 400);
  }

  let payload;
  try {
    payload = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON inside data parameter' }, 400);
  }

  // 2. Validate Ko-fi Verification Token
  const expectedToken = (env.KOFI_VERIFICATION_TOKEN || '').trim();
  const incomingToken = (payload.verification_token || '').trim();

  if (expectedToken) {
    if (!incomingToken || incomingToken !== expectedToken) {
      return jsonResponse({ error: 'Invalid verification token' }, 403);
    }
  }

  // 3. Obtain database binding
  const db = env.DB || env.dramapuchi_db;
  if (!db) {
    return jsonResponse({ error: 'Database binding (DB) missing' }, 500);
  }

  // 4. Ensure donations and donor_codes tables exist (self-healing migration)
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

    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_donations_code ON donations(donor_code)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_donations_email ON donations(email)`).run();
  } catch {}

  // 5. Extract donation details & donor code (#DP-XXXX)
  const txId = (payload.kofi_transaction_id || payload.message_id || `tx_${Date.now()}`).trim();
  const email = (payload.email || '').trim().toLowerCase();
  const amount = String(payload.amount || '0.00');
  const currency = String(payload.currency || 'USD');
  const fromName = String(payload.from_name || '');
  const rawMessage = String(payload.message || '');
  const now = Date.now();

  const codeRegex = /#DP-[A-Z0-9]{4,8}/i;
  const match = rawMessage.match(codeRegex) || fromName.match(codeRegex);
  const donorCode = match ? match[0].toUpperCase() : null;

  // 6. Check if transaction was already processed
  try {
    const existingTx = await db.prepare('SELECT id, claimed FROM donations WHERE id = ?').bind(txId).first();
    if (existingTx) {
      return new Response('OK (duplicate ignored)', { status: 200 });
    }
  } catch {}

  // 7. Check if donor can be automatically linked to an existing user in user_saves
  let matchedSub = null;
  try {
    if (email) {
      const user = await db.prepare('SELECT sub, state FROM user_saves WHERE lower(email) = ?').bind(email).first();
      if (user) {
        matchedSub = user.sub;
        // Automatically unlock Gen 2 in user's saved state in D1
        let userState = {};
        try { userState = JSON.parse(user.state); } catch {}
        userState.gen2Unlocked = true;
        userState.hasDonated = true;

        await db.prepare(
          'UPDATE user_saves SET state = ?, rev = rev + 1, updated_at = ? WHERE sub = ?'
        ).bind(JSON.stringify(userState), now, user.sub).run();
      }
    }
  } catch (err) {
    console.error('Error linking user on webhook:', err);
  }

  // 8. Insert verified donation record into D1
  const isClaimed = matchedSub ? 1 : 0;
  try {
    await db.prepare(`
      INSERT INTO donations (id, email, amount, currency, from_name, message, donor_code, claimed_by_sub, claimed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      txId,
      email,
      amount,
      currency,
      fromName,
      rawMessage,
      donorCode,
      matchedSub,
      isClaimed,
      now
    ).run();
  } catch (err) {
    return jsonResponse({ error: 'Failed to record donation: ' + err.message }, 500);
  }

  return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}
