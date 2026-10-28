import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';

const startServer = async () => {
  const server = app.listen(env.PORT, () => {
    console.log(`[Server] Placement & Internship Portal API running on http://localhost:${env.PORT}`);
    console.log(`[Server] Health check endpoint available at http://localhost:${env.PORT}/api/health`);
    console.log(`[Server] Environment: ${env.NODE_ENV}`);
  });

  // Attempt DB connection in background without blocking API listener
  connectDatabase().catch((err) => {
    console.warn('[Database] Background connection attempt failed:', err.message);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDatabase();
      process.exit(0);
    });

    // Force exit if hanging
    setTimeout(() => {
      console.error('[Server] Forcing shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
};

startServer().catch((error) => {
  console.error('[Server] Failed to initialize server:', error);
  process.exit(1);
});

