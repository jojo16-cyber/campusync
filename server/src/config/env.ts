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
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ADMIN_NAME?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
}

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_portal',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'campasync_jwt_secret_dev_key_2026_super_secure_32char_token',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ADMIN_NAME: process.env.ADMIN_NAME,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
};

