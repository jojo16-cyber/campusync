import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env if present
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  MONGODB_URI: string;
  CORS_ORIGIN: string;
}

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_portal',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

