import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

describe('App Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the portal title and key feature sections', () => {
    render(<App />);

    expect(screen.getByText(/Campus Placement & Internship Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Student Opportunities/i)).toBeInTheDocument();
    expect(screen.getByText(/Recruiter Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/TPO Administration/i)).toBeInTheDocument();
    expect(screen.getByText(/System Diagnostics/i)).toBeInTheDocument();
  });

  it('displays health check data on successful fetch', async () => {
    const mockHealthResponse = {
      success: true,
      message: 'Service health check successful',
      data: {
        status: 'healthy',
        uptimeSeconds: 120,
        environment: 'development',
        timestamp: '2026-10-28T08:00:00.000Z',
        services: {
          server: 'operational',
          database: {
            status: 'disconnected',
            readyState: 0,
          },
        },
        version: '1.0.0',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockHealthResponse,
    } as Response);

    render(<App />);

    const button = screen.getByTestId('health-btn');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('health-result')).toBeInTheDocument();
    });

    expect(screen.getByText(/Backend Status: Operational/i)).toBeInTheDocument();
    expect(screen.getByText(/120 seconds/i)).toBeInTheDocument();
  });

  it('displays error message when health check fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    const button = screen.getByTestId('health-btn');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('health-error')).toBeInTheDocument();
    });

    expect(screen.getByText(/Network error/i)).toBeInTheDocument();
  });
});
