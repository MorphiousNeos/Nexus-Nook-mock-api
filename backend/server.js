// =============================================================================
// NEXUS NOOK BACKEND - PRODUCTION API SERVER
// Star Citizen Companion App backend with RSI integration (mock)
// =============================================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const crypto = require('crypto');
const { Pool } = require('pg');
const Redis = require('ioredis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Render (and most PaaS hosts) sit behind a reverse proxy; trust it so
// req.protocol and client IPs (used by the rate limiter) are correct.
app.set('trust proxy', 1);

// =============================================================================
// DATABASE SETUP
// =============================================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const redis = new Redis(process.env.REDIS_URL);

// =============================================================================
// MIDDLEWARE
// =============================================================================
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});
app.use('/api/', limiter);

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// =============================================================================
// RSI PUBLIC PROFILE LOOKUP
// =============================================================================
// IMPORTANT COMPLIANCE NOTE:
// Star Citizen / RSI has no official public API. This client looks up a user's
// PUBLIC RSI handle (the citizen handle anyone can view at
// robertsspaceindustries.com/citizens/<handle>). It must NEVER ask for or store
// a user's RSI password or log into their account on their behalf — doing so
// breaches RSI's Terms of Service and is an unacceptable security risk.
//
// The implementation below is a MOCK for development. A production build must
// source only publicly-available data through a ToS-compliant community API
// (see docs/COMPLIANCE.md) and prominently mark the app as unofficial / not
// affiliated with Cloud Imperium Games.
class RSIApiClient {
  constructor() {
    this.baseUrl = 'https://robertsspaceindustries.com';
    this.sessionCache = new Map();
  }

  // Looks up public data for a citizen handle. No credentials involved.
  async lookupPublicProfile(handle) {
    try {
      console.log('Looking up public RSI handle (mock):', handle);

      // Mock response for development.
      return {
        handle,
        organization: 'Nexus Vanguard',
        uec: 750000,
        ships: [
          {
            id: 'avenger_titan',
            name: 'Aegis Avenger Titan',
            manufacturer: 'Aegis Dynamics',
            type: 'Light Fighter',
            cargo: 8,
            crew: 1,
            speed: 220,
            price: 785000,
            pledge: true,
            status: 'Ready',
            location: 'Port Olisar',
            insurance: 'Active',
          },
        ],
        inventory: [],
      };
    } catch (error) {
      console.error('RSI lookup error:', error);
      throw new Error('Failed to look up RSI handle');
    }
  }

  async fetchProfile(token) {
    const cacheKey = `rsi:profile:${token}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    return {};
  }

  async fetchHangar(handle) {
    const cacheKey = `rsi:hangar:${handle}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    return [];
  }

  async syncUserData(handle) {
    const [profile, ships] = await Promise.all([
      this.fetchProfile(handle),
      this.fetchHangar(handle),
    ]);
    return { profile, ships };
  }
}

const rsiClient = new RSIApiClient();

// =============================================================================
// API ROUTES
// =============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Nexus Nook API v1.0',
  });
});

// -----------------------------------------------------------------------------
// USER AUTHENTICATION
// -----------------------------------------------------------------------------

// Register user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, username, email, created_at`,
      [username, email, hashedPassword]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        rsiConnected: user.rsi_connected,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// -----------------------------------------------------------------------------
// DISCORD OAUTH
// -----------------------------------------------------------------------------
// Sign in with Discord (identify + email scopes only — we never touch guilds,
// messages, or anything else). Configure with DISCORD_CLIENT_ID and
// DISCORD_CLIENT_SECRET; the redirect URI registered in the Discord developer
// portal must be <API_PUBLIC_URL>/api/auth/discord/callback.

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const discordConfigured = !!(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET);

// Where to send the browser back to after auth. WEB_APP_URL is the full app
// URL including any path (GitHub Pages project sites live under a subpath);
// FRONTEND_URL is the bare origin used for CORS. Trailing slash normalized.
const frontendUrl = () =>
  (process.env.WEB_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );

const apiPublicUrl = (req) =>
  (process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

// One-time OAuth state tokens. Redis when available, in-memory fallback so
// local dev without Redis still works.
const oauthStateFallback = new Map();
async function storeOauthState(state) {
  try {
    await redis.set(`oauth:state:${state}`, '1', 'EX', 600);
  } catch {
    oauthStateFallback.set(state, Date.now());
    // Prune anything older than 10 minutes.
    for (const [k, t] of oauthStateFallback) {
      if (Date.now() - t > 600000) oauthStateFallback.delete(k);
    }
  }
}
async function consumeOauthState(state) {
  if (!state) return false;
  try {
    const key = `oauth:state:${state}`;
    const found = await redis.get(key);
    if (found) {
      await redis.del(key);
      return true;
    }
  } catch {
    /* fall through to memory */
  }
  if (oauthStateFallback.has(state)) {
    const fresh = Date.now() - oauthStateFallback.get(state) < 600000;
    oauthStateFallback.delete(state);
    return fresh;
  }
  return false;
}

const issueToken = (user) =>
  jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

// Kick off the OAuth dance.
app.get('/api/auth/discord', async (req, res) => {
  if (!discordConfigured) {
    // Full-page navigation lands here, so bounce back to the app with a
    // readable message rather than a raw JSON error.
    return res.redirect(
      `${frontendUrl()}/#/auth?error=${encodeURIComponent(
        'Discord sign-in is not configured on this server yet.',
      )}`,
    );
  }
  const state = crypto.randomBytes(24).toString('hex');
  await storeOauthState(state);
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: 'code',
    redirect_uri: `${apiPublicUrl(req)}/api/auth/discord/callback`,
    scope: 'identify email',
    state,
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

// Handle the callback: exchange code, upsert user, hand a JWT to the web app
// via the URL hash (never a query string — hashes aren't sent to servers or
// logged by intermediaries).
app.get('/api/auth/discord/callback', async (req, res) => {
  const fail = (msg) =>
    res.redirect(`${frontendUrl()}/#/auth?error=${encodeURIComponent(msg)}`);

  try {
    if (!discordConfigured) return fail('Discord sign-in is not configured.');
    const { code, state } = req.query;
    if (!code) return fail('Discord did not return a sign-in code.');
    if (!(await consumeOauthState(state))) {
      return fail('Sign-in session expired — please try again.');
    }

    const tokenResp = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: `${apiPublicUrl(req)}/api/auth/discord/callback`,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
    );

    const me = (
      await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenResp.data.access_token}` },
        timeout: 10000,
      })
    ).data;

    const discordId = String(me.id);
    const displayName = (me.global_name || me.username || 'Citizen').slice(0, 60);
    const email = me.verified && me.email ? String(me.email).toLowerCase() : null;

    // 1) Existing Discord-linked account.
    let result = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
    let user = result.rows[0];

    // 2) Existing email account (verified email only) — link Discord to it.
    if (!user && email) {
      result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        user = result.rows[0];
        await pool.query('UPDATE users SET discord_id = $1, updated_at = NOW() WHERE id = $2', [
          discordId,
          user.id,
        ]);
      }
    }

    // 3) Brand new account. Username must be unique; suffix on collision.
    if (!user) {
      let username = displayName;
      const clash = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
      if (clash.rows.length > 0) username = `${displayName}-${discordId.slice(-4)}`;
      // Random unusable password — Discord is the credential for this account.
      const password = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const placeholderEmail = email || `discord-${discordId}@users.nexusnook.invalid`;
      result = await pool.query(
        `INSERT INTO users (username, email, password, discord_id, created_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [username, placeholderEmail, password, discordId]
      );
      user = result.rows[0];
    }

    const token = issueToken(user);
    res.redirect(`${frontendUrl()}/#/auth?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('Discord OAuth error:', error?.response?.data || error.message);
    return fail('Discord sign-in failed — please try again.');
  }
});

// -----------------------------------------------------------------------------
// RSI INTEGRATION ROUTES
// -----------------------------------------------------------------------------

// Link a public RSI handle (no credentials — see compliance note above)
app.post('/api/rsi/connect', authenticateToken, async (req, res) => {
  try {
    const { rsiHandle } = req.body;
    const userId = req.user.userId;

    if (!rsiHandle || typeof rsiHandle !== 'string' || !rsiHandle.trim()) {
      return res.status(400).json({ error: 'A public RSI handle is required' });
    }

    const rsiData = await rsiClient.lookupPublicProfile(rsiHandle.trim());

    await pool.query(
      `UPDATE users
       SET rsi_connected = true,
           rsi_handle = $1,
           rsi_organization = $2,
           last_rsi_sync = NOW()
       WHERE id = $3`,
      [rsiData.handle, rsiData.organization, userId]
    );

    for (const ship of rsiData.ships) {
      await pool.query(
        `INSERT INTO user_ships (user_id, ship_name, manufacturer, type, pledge, data)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, ship_name) DO UPDATE
         SET data = $6, updated_at = NOW()`,
        [userId, ship.name, ship.manufacturer, ship.type, ship.pledge, JSON.stringify(ship)]
      );
    }

    res.json({
      success: true,
      message: 'RSI account connected successfully',
      data: {
        handle: rsiData.handle,
        organization: rsiData.organization,
        shipsImported: rsiData.ships.length,
      },
    });
  } catch (error) {
    console.error('RSI connection error:', error);
    res.status(500).json({ error: 'Failed to connect RSI account', details: error.message });
  }
});

// Sync RSI data
app.post('/api/rsi/sync', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const userResult = await pool.query('SELECT rsi_handle FROM users WHERE id = $1', [userId]);

    if (!userResult.rows[0]?.rsi_handle) {
      return res.status(400).json({ error: 'RSI account not connected' });
    }

    const handle = userResult.rows[0].rsi_handle;
    await rsiClient.syncUserData(handle);

    await pool.query('UPDATE users SET last_rsi_sync = NOW() WHERE id = $1', [userId]);

    res.json({
      success: true,
      message: 'Data synced successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('RSI sync error:', error);
    res.status(500).json({ error: 'Failed to sync RSI data' });
  }
});

// Get user ships
app.get('/api/ships', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT * FROM user_ships WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const ships = result.rows.map((row) => ({ id: row.id, ...row.data }));

    res.json({ ships });
  } catch (error) {
    console.error('Get ships error:', error);
    res.status(500).json({ error: 'Failed to fetch ships' });
  }
});

// -----------------------------------------------------------------------------
// USER DATA ROUTES
// -----------------------------------------------------------------------------

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT id, username, email, rsi_connected, rsi_handle,
              rsi_organization, last_rsi_sync, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Save user progress
app.post('/api/user/save', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gameData } = req.body;

    await pool.query(
      `INSERT INTO user_progress (user_id, data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET data = $2, updated_at = NOW()`,
      [userId, JSON.stringify(gameData)]
    );

    res.json({ success: true, message: 'Progress saved' });
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// Load user progress
app.get('/api/user/load', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query('SELECT data FROM user_progress WHERE user_id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.json({ gameData: null });
    }

    res.json({ gameData: result.rows[0].data });
  } catch (error) {
    console.error('Load progress error:', error);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

// -----------------------------------------------------------------------------
// SERVER STATUS ROUTES
// -----------------------------------------------------------------------------

// Get live server status (mock data, cached 30s)
app.get('/api/servers/status', async (req, res) => {
  try {
    const cached = await redis.get('server:status');
    if (cached) {
      return res.json({ servers: JSON.parse(cached) });
    }

    const servers = [
      { region: 'US East', status: 'Online', players: Math.floor(Math.random() * 700), latency: 35, capacity: 700 },
      { region: 'US West', status: 'Online', players: Math.floor(Math.random() * 700), latency: 52, capacity: 700 },
      { region: 'EU', status: 'Online', players: Math.floor(Math.random() * 700), latency: 78, capacity: 700 },
      { region: 'Asia', status: 'Online', players: Math.floor(Math.random() * 700), latency: 145, capacity: 700 },
      { region: 'AU', status: 'Online', players: Math.floor(Math.random() * 700), latency: 180, capacity: 700 },
    ];

    await redis.setex('server:status', 30, JSON.stringify(servers));
    res.json({ servers });
  } catch (error) {
    console.error('Server status error:', error);
    res.status(500).json({ error: 'Failed to fetch server status' });
  }
});

// =============================================================================
// COMMUNITY ROUTES (LFG, feed, marketplace)
// =============================================================================
// All listings are public to read; creating/deleting requires auth. Authors are
// surfaced by their public username only. User-generated content — keep it
// civil; no RSI account data is involved.

const clamp = (s, n) => (typeof s === 'string' ? s.trim().slice(0, n) : '');

// Accepts either a SID alone (e.g. "TEST") or a pasted RSI org URL and
// extracts the SID portion. Returns null if nothing usable is found.
// RSI SIDs are uppercase alphanumeric, 1-30 chars.
const normalizeRsiSid = (input) => {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/\/orgs\/([A-Z0-9]+)/i);
  const candidate = urlMatch ? urlMatch[1] : trimmed;
  const sid = candidate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (sid.length < 1 || sid.length > 30) return null;
  return sid;
};

// --- Looking For Group ---
app.get('/api/lfg', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.id, l.title, l.activity, l.region, l.players_needed, l.body,
              l.created_at, u.username AS author
       FROM lfg_posts l JOIN users u ON u.id = l.user_id
       ORDER BY l.created_at DESC LIMIT 100`
    );
    res.json({ posts: result.rows });
  } catch (error) {
    console.error('LFG list error:', error);
    res.status(500).json({ error: 'Failed to load LFG posts' });
  }
});

app.post('/api/lfg', authenticateToken, async (req, res) => {
  try {
    const title = clamp(req.body.title, 140);
    if (!title) return res.status(400).json({ error: 'A title is required' });
    const activity = clamp(req.body.activity, 60) || null;
    const region = clamp(req.body.region, 60) || null;
    const body = clamp(req.body.body, 2000) || null;
    const playersNeeded = Number.isFinite(+req.body.playersNeeded)
      ? Math.max(0, Math.min(100, parseInt(req.body.playersNeeded, 10)))
      : null;

    const result = await pool.query(
      `INSERT INTO lfg_posts (user_id, title, activity, region, players_needed, body)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [req.user.userId, title, activity, region, playersNeeded, body]
    );
    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('LFG create error:', error);
    res.status(500).json({ error: 'Failed to create LFG post' });
  }
});

app.delete('/api/lfg/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM lfg_posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('LFG delete error:', error);
    res.status(500).json({ error: 'Failed to delete LFG post' });
  }
});

// --- Community feed ---
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.body, p.image_url, p.created_at, u.username AS author
       FROM community_posts p JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC LIMIT 100`
    );
    res.json({ posts: result.rows });
  } catch (error) {
    console.error('Posts list error:', error);
    res.status(500).json({ error: 'Failed to load posts' });
  }
});

app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const body = clamp(req.body.body, 2000);
    if (!body) return res.status(400).json({ error: 'Post body is required' });
    const imageUrl = clamp(req.body.imageUrl, 500) || null;

    const result = await pool.query(
      `INSERT INTO community_posts (user_id, body, image_url)
       VALUES ($1, $2, $3) RETURNING id, created_at`,
      [req.user.userId, body, imageUrl]
    );
    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Post create error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM community_posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Post delete error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// --- Marketplace ---
app.get('/api/market', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.id, m.kind, m.title, m.price, m.body, m.created_at, u.username AS author
       FROM market_listings m JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at DESC LIMIT 100`
    );
    res.json({ listings: result.rows });
  } catch (error) {
    console.error('Market list error:', error);
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

app.post('/api/market', authenticateToken, async (req, res) => {
  try {
    const title = clamp(req.body.title, 140);
    if (!title) return res.status(400).json({ error: 'A title is required' });
    const allowed = ['sell', 'buy', 'trade'];
    const kind = allowed.includes(req.body.kind) ? req.body.kind : 'sell';
    const body = clamp(req.body.body, 2000) || null;
    const price = Number.isFinite(+req.body.price)
      ? Math.max(0, Math.round(+req.body.price))
      : null;

    const result = await pool.query(
      `INSERT INTO market_listings (user_id, kind, title, price, body)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
      [req.user.userId, kind, title, price, body]
    );
    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Market create error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

app.delete('/api/market/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM market_listings WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Market delete error:', error);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

// =============================================================================
// ORG / OPERATIONS ROUTES
// =============================================================================

// List all orgs (public) with member counts.
app.get('/api/orgs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.name, o.tag, o.description, o.rsi_sid, o.created_at,
              u.username AS owner,
              (SELECT COUNT(*) FROM org_members m WHERE m.org_id = o.id) AS member_count
       FROM orgs o JOIN users u ON u.id = o.owner_id
       ORDER BY o.created_at DESC LIMIT 100`
    );
    res.json({ orgs: result.rows });
  } catch (error) {
    console.error('Orgs list error:', error);
    res.status(500).json({ error: 'Failed to load orgs' });
  }
});

// Create an org (creator becomes owner + first member).
app.post('/api/orgs', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const name = clamp(req.body.name, 120);
    if (!name) return res.status(400).json({ error: 'An org name is required' });
    const tag = clamp(req.body.tag, 20) || null;
    const description = clamp(req.body.description, 2000) || null;
    const rsiSid = normalizeRsiSid(req.body.rsiSid ?? req.body.rsi_sid);

    await client.query('BEGIN');
    const orgResult = await client.query(
      `INSERT INTO orgs (owner_id, name, tag, description, rsi_sid)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user.userId, name, tag, description, rsiSid]
    );
    const orgId = orgResult.rows[0].id;
    await client.query(
      `INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [orgId, req.user.userId]
    );
    await client.query('COMMIT');
    res.status(201).json({ success: true, id: orgId });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Org create error:', error);
    res.status(500).json({ error: 'Failed to create org' });
  } finally {
    client.release();
  }
});

// Org detail: members + scheduled ops.
app.get('/api/orgs/:id', async (req, res) => {
  try {
    const orgResult = await pool.query(
      `SELECT o.id, o.name, o.tag, o.description, o.rsi_sid, o.created_at, o.owner_id,
              u.username AS owner
       FROM orgs o JOIN users u ON u.id = o.owner_id WHERE o.id = $1`,
      [req.params.id]
    );
    if (orgResult.rows.length === 0) return res.status(404).json({ error: 'Org not found' });

    const members = await pool.query(
      `SELECT u.username AS name, m.role, m.joined_at
       FROM org_members m JOIN users u ON u.id = m.user_id
       WHERE m.org_id = $1 ORDER BY m.joined_at ASC`,
      [req.params.id]
    );
    const ops = await pool.query(
      `SELECT e.id, e.title, e.starts_at, e.body, e.created_at, u.username AS author
       FROM ops_events e JOIN users u ON u.id = e.user_id
       WHERE e.org_id = $1 ORDER BY e.starts_at NULLS LAST, e.created_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json({ org: orgResult.rows[0], members: members.rows, ops: ops.rows });
  } catch (error) {
    console.error('Org detail error:', error);
    res.status(500).json({ error: 'Failed to load org' });
  }
});

// Join an org.
app.post('/api/orgs/:id/join', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO org_members (org_id, user_id) VALUES ($1, $2)
       ON CONFLICT (org_id, user_id) DO NOTHING`,
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Org join error:', error);
    res.status(500).json({ error: 'Failed to join org' });
  }
});

// Leave an org (the owner cannot leave their own org).
app.post('/api/orgs/:id/leave', authenticateToken, async (req, res) => {
  try {
    const owner = await pool.query('SELECT owner_id FROM orgs WHERE id = $1', [req.params.id]);
    if (owner.rows[0]?.owner_id === req.user.userId) {
      return res.status(400).json({ error: 'The owner cannot leave; delete the org instead.' });
    }
    await pool.query('DELETE FROM org_members WHERE org_id = $1 AND user_id = $2', [
      req.params.id,
      req.user.userId,
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error('Org leave error:', error);
    res.status(500).json({ error: 'Failed to leave org' });
  }
});

// Delete an org (owner only).
app.delete('/api/orgs/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM orgs WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Org delete error:', error);
    res.status(500).json({ error: 'Failed to delete org' });
  }
});

// Schedule an operation/event (members only).
app.post('/api/orgs/:id/ops', authenticateToken, async (req, res) => {
  try {
    const member = await pool.query(
      'SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    if (member.rows.length === 0) {
      return res.status(403).json({ error: 'Join the org to schedule operations.' });
    }
    const title = clamp(req.body.title, 140);
    if (!title) return res.status(400).json({ error: 'A title is required' });
    const body = clamp(req.body.body, 2000) || null;
    let startsAt = null;
    if (req.body.startsAt) {
      const d = new Date(req.body.startsAt);
      if (!isNaN(d.getTime())) startsAt = d.toISOString();
    }

    const result = await pool.query(
      `INSERT INTO ops_events (org_id, user_id, title, starts_at, body)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.params.id, req.user.userId, title, startsAt, body]
    );
    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Ops create error:', error);
    res.status(500).json({ error: 'Failed to schedule operation' });
  }
});

// Delete an operation (its author or the org owner).
app.delete('/api/orgs/:id/ops/:eventId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM ops_events e
       USING orgs o
       WHERE e.id = $1 AND e.org_id = $2 AND o.id = e.org_id
         AND (e.user_id = $3 OR o.owner_id = $3)
       RETURNING e.id`,
      [req.params.eventId, req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Ops delete error:', error);
    res.status(500).json({ error: 'Failed to delete operation' });
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// =============================================================================
// START SERVER
// =============================================================================
app.listen(PORT, () => {
  console.log(`Nexus Nook API server v1.0 listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = app;
