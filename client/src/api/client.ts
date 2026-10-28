import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'campasync_auth_token';

// Create configured Axios instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: attach authorization token
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Unable to access localStorage for auth token', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized on a protected route, remove stale token
      const isAuthCheck = error.config && error.config.url?.includes('/auth/me');
      if (isAuthCheck) {
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {
          // ignore storage errors
        }
      }
    }
    return Promise.reject(error);
  }
);
