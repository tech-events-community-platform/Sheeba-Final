import app from './app';
import { ENV } from './config/env';
import pool from './config/db';
import { runMigrations } from './db/migrate';

const startServer = async () => {
  try {
    console.log('----------------------------------------------------');
    console.log('🚀 Starting Sheba Backend Server...');
    console.log(`🌍 Environment: ${ENV.NODE_ENV}`);
    console.log('----------------------------------------------------');

    // Test DB connection, run migrations if DATABASE_URL is configured..
    if (ENV.DATABASE_URL && !ENV.DATABASE_URL.includes('YOUR_NEON_PASSWORD')) {
      try {
        console.log('Connecting to PostgreSQL database...');
        const client = await pool.connect();
        console.log('✅ Successfully connected to PostgreSQL (Neon)!');
        client.release();

        // Run migrations
        await runMigrations();
      } catch (dbError) {
        console.error('⚠️ Database connection / migration warning:', dbError);
        console.log('Server will continue running. Update DATABASE_URL in .env to connect to your live Neon database.');
      }
    } else {
      console.log('ℹ️  DATABASE_URL placeholder detected. Please configure your Neon connection string in .env');
    }

    const server = app.listen(ENV.PORT, () => {
      console.log(`✅ Sheba Backend running on http://localhost:${ENV.PORT}`);
      console.log(`📡 Health Check: http://localhost:${ENV.PORT}/api/health`);
    });

    // Graceful Shutdown
    const shutdown = async () => {
      console.log('Shutting down Sheba Backend gracefully...');
      server.close(async () => {
        await pool.end();
        console.log('PostgreSQL pool closed. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

