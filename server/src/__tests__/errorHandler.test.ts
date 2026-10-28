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
});
