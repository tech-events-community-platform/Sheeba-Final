import dotenv from 'dotenv';
dotenv.config();

/**
 * Returns the authoritative frontend base URL for links in emails and QR tokens.
 * Defaults to 'https://sheebanet.com' in production, or 'http://localhost:5173' for local development.
 */
export function getFrontendUrl(): string {
  const explicit = (process.env.FRONTEND_URL || '').trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }
  const isProd = process.env.NODE_ENV === 'production';
  return isProd ? 'https://sheebanet.com' : 'http://localhost:5173';
}

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'sheba_default_jwt_secret_change_in_prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  TICKET_SIGNING_SECRET: process.env.TICKET_SIGNING_SECRET || 'sheba_default_ticket_secret_change_in_prod',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  LINKS_ET_API_KEY: process.env.LINKS_ET_API_KEY || process.env.PAYMENT_VERIFICATION_API_KEY || '',
  REDIS_URL: process.env.REDIS_URL || '',
  REDIS_HOST: process.env.REDIS_HOST || '',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || process.env.REDIS_API_KEY || '',
  get FRONTEND_URL(): string {
    return getFrontendUrl();
  },
};

if (ENV.NODE_ENV === 'production') {
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET === 'sheba_default_jwt_secret_change_in_prod' ||
    process.env.JWT_SECRET === 'super_secret_jwt_session_key_sheba_2026'
  ) {
    console.error('🚨 [SECURITY WARNING]: JWT_SECRET is using a default or example placeholder in production! Set a real high-entropy secret in Dokploy.');
  }
  if (
    !process.env.TICKET_SIGNING_SECRET ||
    process.env.TICKET_SIGNING_SECRET === 'sheba_default_ticket_secret_change_in_prod' ||
    process.env.TICKET_SIGNING_SECRET === 'super_secret_qr_signing_key_sheba_2026'
  ) {
    console.error('🚨 [SECURITY WARNING]: TICKET_SIGNING_SECRET is using a default or example placeholder in production! Set a real high-entropy secret in Dokploy.');
  }
}

