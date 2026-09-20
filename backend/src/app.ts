import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { generalLimiter } from './middlewares/rateLimit.middleware';

const app: Application = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin:
      ENV.CORS_ORIGIN === '*'
        ? true
        : ENV.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply General Rate Limiting to all /api routes (150 req / 15 min per IP)
app.use('/api', generalLimiter);

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Sheba Event Management & Verified Attendance API',
    version: '1.0.0',
    status: 'ACTIVE',
    documentation: '/api/health',
  });
});

// API Routes
app.use('/api', apiRoutes);

// 404 Catch-All
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;

