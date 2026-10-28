import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { apiClient, TOKEN_STORAGE_KEY } from '../api/client';
import { StudentApplicationData } from '../api/applications';

describe('Student Applications & Tracking Flow (/applications)', () => {
  const mockStudentUser = {
    id: 'usr_student_01',
    name: 'Emily Davis',
    email: 'emily@college.edu',
    role: 'student' as const,
    createdAt: '2026-10-28T10:00:00Z',
    updatedAt: '2026-10-28T10:00:00Z',
  };

  const mockAdminUser = {
    id: 'usr_admin_01',
    name: 'TPO Director',
    email: 'tpo@college.edu',
    role: 'admin' as const,
    createdAt: '2026-10-28T10:00:00Z',
    updatedAt: '2026-10-28T10:00:00Z',
  };

  const mockApplications: StudentApplicationData[] = [
    {
      id: 'app_01',
      student: 'usr_student_01',
      listing: {
        id: 'list_01',
        companyName: 'Google',
        title: 'Associate Software Engineer',
        opportunityType: 'full_time',
        location: 'Bangalore',
        workArrangement: 'hybrid',
        compensation: '25 LPA',
        status: 'published',
        applicationDeadline: '2026-12-31T00:00:00Z',
      },
      status: 'submitted',
      coverLetter: 'I am excited to apply for Google as a full-stack engineer.',
      submittedAt: '2026-10-28T12:00:00Z',
      createdAt: '2026-10-28T12:00:00Z',
      updatedAt: '2026-10-28T12:00:00Z',
    },
    {
      id: 'app_02',
      student: 'usr_student_01',
      listing: {
        id: 'list_02',
        companyName: 'Microsoft',
        title: 'Cloud Infrastructure Intern',
        opportunityType: 'internship',
        location: 'Hyderabad',
        workArrangement: 'on_site',
        compensation: '18 LPA',
        status: 'published',
        applicationDeadline: '2026-12-15T00:00:00Z',
      },
      status: 'shortlisted',
      coverLetter: '',
      submittedAt: '2026-10-27T10:00:00Z',
      createdAt: '2026-10-27T10:00:00Z',
      updatedAt: '2026-10-27T10:00:00Z',
    },
    {
      id: 'app_03',
      student: 'usr_student_01',
      listing: {
        id: 'list_03',
        companyName: 'Amazon',
        title: 'SDE Intern',
        opportunityType: 'internship',
        location: 'Bangalore',
        workArrangement: 'on_site',
        compensation: '80k/mo',
        status: 'published',
        applicationDeadline: '2026-11-20T00:00:00Z',
      },
      status: 'selected',
      coverLetter: '',
      submittedAt: '2026-10-20T08:00:00Z',
      createdAt: '2026-10-20T08:00:00Z',
      updatedAt: '2026-10-20T08:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const setupAuthenticatedUser = (
    user: { id: string; name: string; email: string; role: 'student' | 'admin'; createdAt: string; updatedAt: string } = mockStudentUser,
    apps: StudentApplicationData[] = mockApplications
  ) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'valid_jwt');

    vi.spyOn(apiClient, 'get').mockImplementation((url) => {
      if (url === '/auth/me') {
        return Promise.resolve({ data: { success: true, data: { user } } });
      }
      if (url === '/applications/me') {
        return Promise.resolve({
          data: {
            success: true,
            data: { applications: apps, count: apps.length },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });
  };

  it('redirects unauthenticated user accessing /applications to /login', async () => {
    window.history.pushState({}, 'Applications', '/applications');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome to CampuSync/i })).toBeInTheDocument();
      expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
    });
  });

  it('renders empty state when student has no applications', async () => {
    setupAuthenticatedUser(mockStudentUser, []);
    window.history.pushState({}, 'Applications', '/applications');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-applications')).toBeInTheDocument();
    });

    expect(screen.getByTestId('metric-total')).toHaveTextContent('0');
    expect(screen.getByText(/You have not submitted any placement or internship applications yet/i)).toBeInTheDocument();
  });

  it('renders student applications list with pipeline KPI metrics', async () => {
    setupAuthenticatedUser(mockStudentUser, mockApplications);
    window.history.pushState({}, 'Applications', '/applications');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('metric-total')).toHaveTextContent('3');
    });

    // Check pipeline metrics
    expect(screen.getByTestId('metric-review')).toHaveTextContent('1'); // app_01: submitted
    expect(screen.getByTestId('metric-shortlisted')).toHaveTextContent('1'); // app_02: shortlisted
    expect(screen.getByTestId('metric-selected')).toHaveTextContent('1'); // app_03: selected

    // Check application cards
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Associate Software Engineer')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-app_01')).toHaveTextContent(/Submitted/i);

    expect(screen.getByText('Microsoft')).toBeInTheDocument();
    expect(screen.getByText('Cloud Infrastructure Intern')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-app_02')).toHaveTextContent(/Shortlisted/i);

    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-app_03')).toHaveTextContent(/Selected & Offered/i);
  });

  it('toggles visibility of the student application statement / cover letter', async () => {
    setupAuthenticatedUser(mockStudentUser, mockApplications);
    window.history.pushState({}, 'Applications', '/applications');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('toggle-statement-app_01')).toBeInTheDocument();
    });

    // Statement is initially hidden
    expect(screen.queryByTestId('statement-content-app_01')).not.toBeInTheDocument();

    // Click toggle
    fireEvent.click(screen.getByTestId('toggle-statement-app_01'));

    expect(screen.getByTestId('statement-content-app_01')).toBeInTheDocument();
    expect(screen.getByText(/I am excited to apply for Google as a full-stack engineer/i)).toBeInTheDocument();

    // Toggle hide
    fireEvent.click(screen.getByTestId('toggle-statement-app_01'));
    expect(screen.queryByTestId('statement-content-app_01')).not.toBeInTheDocument();
  });

  it('allows student to withdraw an eligible submitted application', async () => {
    setupAuthenticatedUser(mockStudentUser, mockApplications);

    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Application withdrawn successfully',
        data: {
          application: {
            ...mockApplications[0],
            status: 'withdrawn',
          },
        },
      },
    });

    window.history.pushState({}, 'Applications', '/applications');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('withdraw-app-btn-app_01')).toBeInTheDocument();
    });

    // Shortlisted and Selected applications must not have active withdraw button
    expect(screen.queryByTestId('withdraw-app-btn-app_02')).not.toBeInTheDocument();
    expect(screen.queryByTestId('withdraw-app-btn-app_03')).not.toBeInTheDocument();

    // Click withdraw on app_01
    fireEvent.click(screen.getByTestId('withdraw-app-btn-app_01'));

    // Confirmation modal appears
    expect(screen.getByTestId('withdraw-modal')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to withdraw your application/i)).toBeInTheDocument();

    // Confirm withdrawal
    fireEvent.click(screen.getByTestId('confirm-withdraw-btn'));

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/applications/app_01/withdraw');
    });

    await waitFor(() => {
      expect(screen.getByTestId('applications-success-alert')).toBeInTheDocument();
    });
  });

  it('filters applications by search query and status tabs', async () => {
    setupAuthenticatedUser(mockStudentUser, mockApplications);
    window.history.pushState({}, 'Applications', '/applications');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
    });

    // Search for Microsoft
    const searchInput = screen.getByTestId('search-applications-input');
    fireEvent.change(searchInput, { target: { value: 'Microsoft' } });

    expect(screen.getByText('Microsoft')).toBeInTheDocument();
    expect(screen.queryByText('Google')).not.toBeInTheDocument();
    expect(screen.queryByText('Amazon')).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });

    // Filter by Selected status
    fireEvent.click(screen.getByTestId('filter-status-selected'));

    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.queryByText('Google')).not.toBeInTheDocument();
    expect(screen.queryByText('Microsoft')).not.toBeInTheDocument();
  });

  it('renders informational screen when administrator navigates to /applications', async () => {
    setupAuthenticatedUser(mockAdminUser, []);
    window.history.pushState({}, 'Applications', '/applications');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/You are signed in with an administrator account/i)).toBeInTheDocument();
    });
  });
});
