import request from 'supertest';
import express, { Application } from 'express';
import cors from 'cors';
import app from '../app';
import { errorHandler } from '../middlewares/errorHandler';

describe('Cross-Origin Resource Sharing (CORS) Security Enforcement', () => {
  describe('Main Application CORS Handling (/api/health)', () => {
    it('allows requests with missing Origin header (curl, mobile apps, health checks)', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // No Access-Control-Allow-Origin header is sent when Origin header is omitted
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('allows requests with matching localhost development origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('rejects untrusted Vercel origins that are not in CORS_ORIGIN with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-attacker.vercel.app');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/CORS origin not allowed: https:\/\/malicious-attacker\.vercel\.app/i);
    });

    it('rejects arbitrary third-party origins with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil-phishing-domain.com');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/CORS origin not allowed: https:\/\/evil-phishing-domain\.com/i);
    });
  });

  describe('Isolated Production Environment CORS Scenarios', () => {
    const buildTestCorsApp = (nodeEnv: string, corsOrigin: string): Application => {
      const testApp = express();

      testApp.use(
        cors({
          origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin);
            if (nodeEnv !== 'production' && isLocalhost) {
              return callback(null, true);
            }

            if (corsOrigin && corsOrigin !== '*') {
              const allowedOrigins = corsOrigin
                .split(',')
                .map((o) => o.trim().replace(/\/+$/, ''))
                .filter(Boolean);

              const normalizedOrigin = origin.trim().replace(/\/+$/, '');

              if (allowedOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
              }
            }

            return callback(new Error(`CORS origin not allowed: ${origin}`));
          },
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          credentials: true,
        })
      );

      testApp.get('/test', (_req, res) => {
        res.status(200).json({ ok: true });
      });

      testApp.use(errorHandler);
      return testApp;
    };

    it('allows exact production origin configured in CORS_ORIGIN', async () => {
      const prodApp = buildTestCorsApp('production', 'https://campusync-orcin.vercel.app');

      const res = await request(prodApp)
        .get('/test')
        .set('Origin', 'https://campusync-orcin.vercel.app');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://campusync-orcin.vercel.app');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('allows production origin when CORS_ORIGIN has an accidental trailing slash', async () => {
      const prodApp = buildTestCorsApp('production', 'https://campusync-orcin.vercel.app/');

      const res = await request(prodApp)
        .get('/test')
        .set('Origin', 'https://campusync-orcin.vercel.app');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://campusync-orcin.vercel.app');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('successfully handles CORS preflight OPTIONS requests for Vercel origin', async () => {
      const prodApp = buildTestCorsApp('production', 'https://campusync-orcin.vercel.app');

      const res = await request(prodApp)
        .options('/test')
        .set('Origin', 'https://campusync-orcin.vercel.app')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('https://campusync-orcin.vercel.app');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });

    it('rejects arbitrary .vercel.app origin even when valid Vercel app is in CORS_ORIGIN', async () => {
      const prodApp = buildTestCorsApp('production', 'https://campusync.vercel.app');

      const res = await request(prodApp)
        .get('/test')
        .set('Origin', 'https://rogue-app.vercel.app');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('CORS origin not allowed');
    });

    it('blocks localhost in production unless explicitly included in CORS_ORIGIN', async () => {
      const prodApp = buildTestCorsApp('production', 'https://campusync.vercel.app');

      const res = await request(prodApp)
        .get('/test')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('CORS origin not allowed');
    });

    it('supports multiple comma-separated allowed production origins', async () => {
      const prodApp = buildTestCorsApp(
        'production',
        'https://campusync.vercel.app, https://placement.university.edu'
      );

      const res1 = await request(prodApp)
        .get('/test')
        .set('Origin', 'https://campusync.vercel.app');
      expect(res1.status).toBe(200);

      const res2 = await request(prodApp)
        .get('/test')
        .set('Origin', 'https://placement.university.edu');
      expect(res2.status).toBe(200);

      const res3 = await request(prodApp)
        .get('/test')
        .set('Origin', 'https://unauthorized.edu');
      expect(res3.status).toBe(403);
    });

    it('does not allow wildcard origin (*) when credentials are enabled', async () => {
      const wildcardApp = buildTestCorsApp('production', '*');

      const res = await request(wildcardApp)
        .get('/test')
        .set('Origin', 'https://any-site.com');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('CORS origin not allowed');
    });
  });
});
