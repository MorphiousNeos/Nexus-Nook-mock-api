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
const { Pool } = require('pg');
const Redis = require('ioredis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

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
// RSI API INTEGRATION
// =============================================================================
// NOTE: Star Citizen / RSI has no official public API. The methods below are a
// MOCK used for development. A production implementation would need an approved
// data source (community APIs, etc.). Do NOT collect users' real RSI passwords
// without a clear, ToS-compliant integration in place.
class RSIApiClient {
  constructor() {
    this.baseUrl = 'https://robertsspaceindustries.com';
    this.sessionCache = new Map();
  }

  async authenticate(email) {
    try {
      console.log('Authenticating with RSI (mock):', email);

      // Mock response for development.
      return {
        handle: email.split('@')[0],
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
      console.error('RSI Auth Error:', error);
      throw new Error('Failed to authenticate with RSI');
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
// RSI INTEGRATION ROUTES
// -----------------------------------------------------------------------------

// Connect RSI account
app.post('/api/rsi/connect', authenticateToken, async (req, res) => {
  try {
    const { rsiEmail } = req.body;
    const userId = req.user.userId;

    const rsiData = await rsiClient.authenticate(rsiEmail);

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
