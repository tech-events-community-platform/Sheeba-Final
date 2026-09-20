import rateLimit from 'express-rate-limit';

/**
 * General API Limiter: 150 requests per 15 minutes per IP
 * Protects platform from automated DDoS / scraping loops while allowing normal users plenty of headroom.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

/**
 * Strict Auth Limiter: 15 attempts per 15 minutes per IP
 * Guards login, register, and password recovery against brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
  },
});
