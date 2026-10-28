import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 50, // Limit each IP to 50 requests per 15 minutes
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    timestamp: new Date().toISOString(),
  },
  skip: () => env.NODE_ENV === 'test',
});

export const resumeUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 1000 : 30, // 30 uploads per 15 min per IP in non-test
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many resume upload attempts. Please try again after a few minutes.',
    timestamp: new Date().toISOString(),
  },
  skip: () => env.NODE_ENV === 'test',
});

export const resumeDownloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 1000 : 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many resume download requests. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  skip: () => env.NODE_ENV === 'test',
});

