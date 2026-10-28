import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/appError';
import { env } from '../config/env';

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: Error | AppError | ZodError | MongoError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.flatten().fieldErrors;
  } else if ('code' in err && (err as MongoError).code === 11000) {
    // Mongo duplicate key error
    statusCode = 409;
    const keys = Object.keys((err as MongoError).keyValue || {});
    if (keys.includes('student') || keys.includes('listing')) {
      message = 'You have already submitted an application for this opportunity';
    } else {
      const field = keys[0] || 'field';
      message = `An account with this ${field} already exists`;
    }
  } else if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'CastError') {
    // Mongoose bad ObjectId
    statusCode = 400;
    message = 'Invalid resource identifier';
  } else if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    // Malformed JSON payload
    statusCode = 400;
    message = 'Malformed JSON in request body';
  } else if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    (err.name === 'MongooseError' && err.message.includes('buffering timed out'))
  ) {
    // Database connection / network failure
    statusCode = 503;
    message = 'Database service unavailable. Please verify database connectivity and network access.';
  } else {
    // Unhandled or system error
    message = err.message || 'Internal Server Error';
  }

  // Log server errors for observability
  if (statusCode >= 500) {
    console.error(`[Error] Unhandled Exception:`, err);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(details !== undefined && { details }),
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
};

