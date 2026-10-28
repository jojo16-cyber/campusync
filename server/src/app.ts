import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middlewares/requestLogger';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';
import apiRoutes from './routes';

const app: Application = express();

// Trust reverse proxy (Render, Vercel, NGINX) to enable correct client IP detection for rate limiting
app.set('trust proxy', 1);

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server, or health probes)
      if (!origin) return callback(null, true);

      // In non-production environments (development & test), allow localhost access
      const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin);
      if (env.NODE_ENV !== 'production' && isLocalhost) {
        return callback(null, true);
      }

      // Check allowed origins list (exact matching against configured CORS_ORIGIN; disallows wildcard when credentials enabled)
      if (env.CORS_ORIGIN && env.CORS_ORIGIN !== '*') {
        const allowedOrigins = env.CORS_ORIGIN.split(',')
          .map((o) => o.trim())
          .filter(Boolean);

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      }

      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Request parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
app.use(requestLogger);

// Mount API routes
app.use('/api', apiRoutes);

// Root fallback / ping
app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Placement & Internship Portal API is active.',
    docs: '/api/health',
  });
});

// 404 handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
