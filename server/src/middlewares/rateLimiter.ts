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
