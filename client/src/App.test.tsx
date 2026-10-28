import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { apiClient, TOKEN_STORAGE_KEY } from './api/client';

describe('CampuSync Frontend Application Flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    window.history.pushState({}, 'Test Page', '/');
  });

  describe('Home Page & Navigation', () => {
    it('renders portal homepage, branding, and navigation actions', () => {
      render(<App />);

      expect(screen.getByText(/Campus Placement & Internship Management/i)).toBeInTheDocument();
      expect(screen.getByTestId('nav-login-link')).toBeInTheDocument();
      expect(screen.getByTestId('nav-register-link')).toBeInTheDocument();
      expect(screen.getByText(/System Diagnostics/i)).toBeInTheDocument();
    });

    it('performs health check and displays operational backend status', async () => {
      const mockHealth = {
        success: true,
        message: 'Service health check successful',
        data: {
          status: 'healthy',
          uptimeSeconds: 150,
          environment: 'development',
          timestamp: '2026-10-28T12:00:00.000Z',
          services: {
            server: 'operational',
            database: {
              status: 'connected',
              readyState: 1,
            },
          },
          version: '1.0.0',
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth,
      } as Response);

      render(<App />);

      const btn = screen.getByTestId('health-btn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByTestId('health-result')).toBeInTheDocument();
      });

      expect(screen.getByText(/Backend Status: Operational/i)).toBeInTheDocument();
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });
  });

  describe('Authentication Flows', () => {
    it('renders the login page when navigating to /login', async () => {
      window.history.pushState({}, 'Login', '/login');
      render(<App />);

      expect(screen.getByRole('heading', { name: /Welcome to CampuSync/i })).toBeInTheDocument();
      expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
      expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('login-submit-btn')).toBeInTheDocument();
    });

    it('handles successful student login and displays dashboard', async () => {
      window.history.pushState({}, 'Login', '/login');

      const mockUser = {
        id: 'usr_123',
        name: 'Alex Johnson',
        email: 'alex@college.edu',
        role: 'student',
        createdAt: '2026-10-28T10:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      };

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Login successful',
          data: {
            user: mockUser,
            token: 'mock_jwt_token_alex',
          },
        },
      });

      render(<App />);

      fireEvent.change(screen.getByTestId('login-email-input'), {
        target: { value: 'alex@college.edu' },
      });
      fireEvent.change(screen.getByTestId('login-password-input'), {
        target: { value: 'Password123!' },
      });

      fireEvent.click(screen.getByTestId('login-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-welcome')).toHaveTextContent(/Welcome back, Alex Johnson/i);
      });

      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('mock_jwt_token_alex');
      expect(screen.getByTestId('logout-btn')).toBeInTheDocument();
      expect(screen.getByTestId('user-role-badge')).toHaveTextContent('student');
    });

    it('displays error message when login fails with invalid credentials', async () => {
      window.history.pushState({}, 'Login', '/login');

      vi.spyOn(apiClient, 'post').mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            success: false,
            message: 'Invalid email or password',
          },
        },
      });

      render(<App />);

      fireEvent.change(screen.getByTestId('login-email-input'), {
        target: { value: 'wrong@college.edu' },
      });
      fireEvent.change(screen.getByTestId('login-password-input'), {
        target: { value: 'BadPassword123!' },
      });

      fireEvent.click(screen.getByTestId('login-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent(/Invalid email or password/i);
      });
    });

    it('renders the registration page when navigating to /register', () => {
      window.history.pushState({}, 'Register', '/register');
      render(<App />);

      expect(screen.getByRole('heading', { name: /Create Student Account/i })).toBeInTheDocument();
      expect(screen.getByTestId('register-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('register-email-input')).toBeInTheDocument();
      expect(screen.getByTestId('register-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('register-confirm-password-input')).toBeInTheDocument();
    });

    it('validates password mismatch on registration', async () => {
      window.history.pushState({}, 'Register', '/register');
      render(<App />);

      fireEvent.change(screen.getByTestId('register-name-input'), {
        target: { value: 'Bob Smith' },
      });
      fireEvent.change(screen.getByTestId('register-email-input'), {
        target: { value: 'bob@college.edu' },
      });
      fireEvent.change(screen.getByTestId('register-password-input'), {
        target: { value: 'Password123!' },
      });
      fireEvent.change(screen.getByTestId('register-confirm-password-input'), {
        target: { value: 'DifferentPassword123!' },
      });

      fireEvent.click(screen.getByTestId('register-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('register-error')).toHaveTextContent(/Passwords do not match/i);
      });
    });

    it('handles student registration and establishes session', async () => {
      window.history.pushState({}, 'Register', '/register');

      const mockStudent = {
        id: 'usr_reg_456',
        name: 'Sara Connor',
        email: 'sara@college.edu',
        role: 'student',
        createdAt: '2026-10-28T10:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      };

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Student registration successful',
          data: {
            user: mockStudent,
            token: 'mock_jwt_token_sara',
          },
        },
      });

      render(<App />);

      fireEvent.change(screen.getByTestId('register-name-input'), {
        target: { value: 'Sara Connor' },
      });
      fireEvent.change(screen.getByTestId('register-email-input'), {
        target: { value: 'sara@college.edu' },
      });
      fireEvent.change(screen.getByTestId('register-password-input'), {
        target: { value: 'SecurePass2026!' },
      });
      fireEvent.change(screen.getByTestId('register-confirm-password-input'), {
        target: { value: 'SecurePass2026!' },
      });

      fireEvent.click(screen.getByTestId('register-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-welcome')).toHaveTextContent(/Welcome back, Sara Connor/i);
      });

      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('mock_jwt_token_sara');
    });

    it('logs out user and clears token when sign out is clicked', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'active_token');

      const mockUser = {
        id: 'usr_active',
        name: 'Active User',
        email: 'active@college.edu',
        role: 'student',
        createdAt: '2026-10-28T10:00:00Z',
        updatedAt: '2026-10-28T10:00:00Z',
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          success: true,
          data: { user: mockUser },
        },
      });

      window.history.pushState({}, 'Dashboard', '/dashboard');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('logout-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('logout-btn'));

      await waitFor(() => {
        expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
        expect(screen.getByTestId('nav-login-link')).toBeInTheDocument();
      });
    });
  });

  describe('Protected Routes', () => {
    it('redirects unauthenticated user accessing /dashboard to /login', async () => {
      window.history.pushState({}, 'Dashboard', '/dashboard');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Welcome to CampuSync/i })).toBeInTheDocument();
        expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
      });
    });
  });
});
