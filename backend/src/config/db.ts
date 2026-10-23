import { Pool as PgPool, QueryResult, QueryResultRow } from 'pg';
import { ENV } from './env';

const isTest = process.env.NODE_ENV === 'test' || ENV.NODE_ENV === 'test';
const prodDbUrl = (process.env.DATABASE_URL || ENV.DATABASE_URL || '').trim();
const testDbUrl = (process.env.TEST_DATABASE_URL || '').trim();

/**
 * Validates database isolation to prevent automated tests from ever touching production
 */
export function assertTestDatabaseIsolation(): void {
  const currentIsTest = process.env.NODE_ENV === 'test' || ENV.NODE_ENV === 'test';
  if (!currentIsTest) return;

  const currentTestDb = (process.env.TEST_DATABASE_URL || '').trim();
  const currentProdDb = (process.env.DATABASE_URL || ENV.DATABASE_URL || '').trim();

  if (!currentTestDb) {
    throw new Error(
      '🚨 [TEST DATABASE GUARD]: TEST_DATABASE_URL is not configured! Automated tests are strictly prohibited from running against or silently falling back to the production DATABASE_URL.'
    );
  }

  if (currentProdDb && currentTestDb === currentProdDb) {
    throw new Error(
      '🚨 [TEST DATABASE GUARD]: TEST_DATABASE_URL matches production DATABASE_URL! Automated tests cannot run against production.'
    );
  }

  if (currentProdDb.includes('neon.tech') && currentTestDb.includes('neon.tech')) {
    try {
      const prodHost = new URL(currentProdDb).host;
      const testHost = new URL(currentTestDb).host;
      if (prodHost && testHost && prodHost === testHost) {
        throw new Error(
          '🚨 [TEST DATABASE GUARD]: TEST_DATABASE_URL points to the production database host. Aborting to protect production data.'
        );
      }
    } catch (err: any) {
      if (err.message?.includes('TEST DATABASE GUARD')) throw err;
    }
  }
}

// Select appropriate connection string
let activeConnectionString = ENV.DATABASE_URL;
if (isTest) {
  if (testDbUrl) {
    assertTestDatabaseIsolation();
    activeConnectionString = testDbUrl;
  } else {
    // In test mode without TEST_DATABASE_URL, leave empty so no connection to production is made
    activeConnectionString = '';
  }
}

const isCloudDb = activeConnectionString.includes('neon.tech') || (!isTest && ENV.NODE_ENV === 'production');

const pool: any = new PgPool({
  connectionString: activeConnectionString || undefined,
  ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
});

pool.on('error', (err: any) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  if (isTest) {
    assertTestDatabaseIsolation();
    const isMutating = /^\s*(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE)\b/i.test(text);
    if (!testDbUrl && isMutating) {
      throw new Error(
        `🚨 [TEST DATABASE GUARD]: Blocked database mutation in test mode without TEST_DATABASE_URL: ${text.substring(0, 50)}`
      );
    }
  }

  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (ENV.NODE_ENV === 'development') {
    // optional debug logging
  }
  return res as QueryResult<T>;
};

export const getClient = async () => {
  if (isTest) {
    assertTestDatabaseIsolation();
  }
  const client = await pool.connect();
  return client;
};

export default pool;