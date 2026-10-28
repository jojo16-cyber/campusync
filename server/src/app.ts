import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middlewares/requestLogger';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';
import apiRoutes from './routes';

const app: Application = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      
      // Allow any localhost origin (e.g., 5173, 5174, etc.)
      const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin);
      if (isLocalhost || origin === env.CORS_ORIGIN || env.CORS_ORIGIN === '*') {
        return callback(null, true);
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

