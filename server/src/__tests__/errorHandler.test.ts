import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { errorHandler } from '../middlewares/errorHandler';
import { notFoundHandler } from '../middlewares/notFoundHandler';

describe('Error Handling Middleware', () => {
  const testApp = express();
  testApp.use(express.json());

  testApp.get('/test/operational-error', () => {
    throw new AppError('Custom operational failure', 400, { field: 'email' });
  });

  testApp.get('/test/generic-error', () => {
    throw new Error('Unexpected crash');
  });

  testApp.get('/test/mongo-selection-error', () => {
    const error = new Error('801D85F101000000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error');
    error.name = 'MongoServerSelectionError';
    throw error;
  });

  testApp.get('/test/mongoose-buffering-error', () => {
    const error = new Error('Operation `users.findOne()` buffering timed out after 10000ms');
    error.name = 'MongooseError';
    throw error;
  });

  testApp.use(notFoundHandler);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  testApp.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    errorHandler(err, req, res, next);
  });

  it('handles 404 for unknown routes', async () => {
    const res = await request(testApp).get('/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Resource not found');
  });

  it('handles operational AppError with custom status and details', async () => {
    const res = await request(testApp).get('/test/operational-error');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Custom operational failure');
    expect(res.body.details).toEqual({ field: 'email' });
  });

  it('handles generic Error with 500 status', async () => {
    const res = await request(testApp).get('/test/generic-error');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Unexpected crash');
  });

  it('handles MongoServerSelectionError with 503 status and sanitized message', async () => {
    const res = await request(testApp).get('/test/mongo-selection-error');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Database service unavailable');
    expect(res.body.message).not.toContain('SSL routines');
  });

  it('handles Mongoose buffering timeout with 503 status', async () => {
    const res = await request(testApp).get('/test/mongoose-buffering-error');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Database service unavailable');
  });
});

