import request from 'supertest';
import app from '../app';

describe('GET /api/health', () => {
  it('should return 200 and health check payload', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message', 'Service health check successful');
    expect(response.body.data).toHaveProperty('status', 'healthy');
    expect(response.body.data).toHaveProperty('environment');
    expect(response.body.data).toHaveProperty('uptimeSeconds');
    expect(response.body.data.services).toHaveProperty('server', 'operational');
    expect(response.body.data.services).toHaveProperty('database');
    expect(response.body.data.services.database).toHaveProperty('status');
  });

  it('should return root info on GET /', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
  });
});

