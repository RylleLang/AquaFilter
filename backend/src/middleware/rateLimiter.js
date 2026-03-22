const rateLimit = require('express-rate-limit');

// General API rate limiter for mobile app routes
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

// Stricter limiter for auth routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please wait 15 minutes.',
  },
});

// Higher throughput for telemetry ingest (ESP32 posts every few seconds)
const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600, // ~10 reads/sec per device
  keyGenerator: (req) => req.headers['x-device-id'] || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Device telemetry rate limit exceeded',
  },
});

module.exports = { apiLimiter, authLimiter, telemetryLimiter };
