require('dotenv').config();

// console.log('data base name ', process.env.DB_NAME);

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Support either an explicit connection URL (Neon) or detailed DB_* env vars.
  // Normalize values like "psql 'postgresql://...'" into a plain URL.
  database: (() => {
    const raw = process.env.DB_URL || process.env.DATABASE_URL || '';
    if (!raw) {
      return {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
        name: process.env.DB_NAME || null,
        user: process.env.DB_USER || null,
        password: process.env.DB_PASS || null,
        url: null
      };
    }

    let url = raw.trim();
    // strip leading psql and surrounding quotes if present
    if (url.startsWith('psql')) url = url.replace(/^psql\s+/, '').trim();
    if ((url.startsWith("'") && url.endsWith("'")) || (url.startsWith('"') && url.endsWith('"'))) url = url.slice(1, -1);

    return { url };
  })(),

  // Automatically sync models on connect (set to true only for development prototyping)
  autoSyncModels: process.env.DB_AUTO_SYNC_MODELS === 'true',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'changeme',
    expire: process.env.JWT_EXPIRE || '7d'
  },

  // Email
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // default 15min
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
  },

  // CORS allowlist
  cors: {
    origin: (() => {
      const raw = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '';
      if (raw) {
        if (raw.includes(',')) return raw.split(',').map((o) => o.trim()).filter(Boolean);
        return raw.trim();
      }

      return ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
    })(),
    credentials: true
  }
};
