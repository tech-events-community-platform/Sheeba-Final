import rateLimit from 'express-rate-limit';

/**
 * General API Limiter:
 * - In development / test: completely skipped so testing, page reloads, and fast iteration are never blocked.
 * - In production: generous 1,500 requests per 15 minutes per IP to allow active users and SPAs plenty of headroom.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip in development or test, or if request originates from localhost
    if (process.env.NODE_ENV !== 'production') return true;
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

/**
 * Strict Auth Limiter:
 * - Guards login, register, and password recovery against brute-force attacks.
 * - In development / test: completely skipped so repeated testing is never locked out.
 * - In production: 30 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV !== 'production') return true;
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
  },
});

