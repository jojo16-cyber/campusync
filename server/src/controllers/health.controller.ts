import { Request, Response } from 'express';
import { getDbStatus } from '../config/db';
import { env } from '../config/env';
import { successResponse } from '../utils/apiResponse';

export const getHealth = (_req: Request, res: Response): void => {
  const dbStatus = getDbStatus();

  const healthData = {
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    services: {
      server: 'operational',
      database: dbStatus,
    },
    version: '1.0.0',
  };

  res.status(200).json(successResponse('Service health check successful', healthData));
};

