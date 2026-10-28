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
    const field = Object.keys((err as MongoError).keyValue || {})[0] || 'field';
    message = `An account with this ${field} already exists`;
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

