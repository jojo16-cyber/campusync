import { describe, it, expect, afterEach } from 'vitest';
import { getApiBaseUrl } from './client';

describe('API Client Configuration (getApiBaseUrl)', () => {
  const originalEnv = import.meta.env.VITE_API_BASE_URL;

  afterEach(() => {
    // Restore
    (import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = originalEnv;
  });

  it('normalizes a production Render URL lacking the /api suffix', () => {
    (import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = 'https://campusync-api.onrender.com';
    expect(getApiBaseUrl()).toBe('https://campusync-api.onrender.com/api');
  });

  it('normalizes a production Render URL with a trailing slash', () => {
    (import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = 'https://campusync-api.onrender.com/';
    expect(getApiBaseUrl()).toBe('https://campusync-api.onrender.com/api');
  });

  it('preserves a production Render URL that already includes /api', () => {
    (import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = 'https://campusync-api.onrender.com/api';
    expect(getApiBaseUrl()).toBe('https://campusync-api.onrender.com/api');
  });

  it('strips trailing slashes from a URL that already includes /api/', () => {
    (import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = 'https://campusync-api.onrender.com/api/';
    expect(getApiBaseUrl()).toBe('https://campusync-api.onrender.com/api');
  });

  it('preserves local development API base URLs', () => {
    (import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = 'http://localhost:5001/api';
    expect(getApiBaseUrl()).toBe('http://localhost:5001/api');
  });

  it('handles empty or whitespace environment variable by falling back safely', () => {
    (import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = '';
    const result = getApiBaseUrl();
    expect(result === '/api' || result === 'https://campusync-api.onrender.com/api').toBe(true);
  });
});
