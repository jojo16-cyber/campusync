import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || env.MONGODB_DB_NAME || 'placement_portal',
      serverSelectionTimeoutMS: 5000,
    });
    const sanitizedUri = env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`[Database] MongoDB connected successfully to ${sanitizedUri}`);
  } catch (error) {
    console.warn('[Database] MongoDB connection failed (server will operate in disconnected mode):', error instanceof Error ? error.message : error);
    // In development or testing, do not crash process immediately if DB is unavailable
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB disconnected successfully');
  }
};

export const getDbStatus = (): { status: string; readyState: number } => {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const readyState = mongoose.connection.readyState;
  return {
    status: states[readyState] || 'unknown',
    readyState,
  };
};

