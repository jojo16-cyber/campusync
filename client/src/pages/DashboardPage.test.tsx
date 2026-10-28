import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { apiClient, TOKEN_STORAGE_KEY } from '../api/client';
import { DashboardAnalyticsData } from '../api/analytics';

describe('Admin Dashboard & Placement Analytics Flow (/dashboard)', () => {
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

  const mockAnalyticsData: DashboardAnalyticsData = {
    kpis: {
      totalStudents: 120,
      activeOpportunities: 8,
      totalApplications: 250,
      selectedStudents: 40,
      totalOffers: 45,
      placementRate: 33.3,
      selectionRate: 18.0,
    },
    statusDistribution: [
      { status: 'submitted', label: 'Submitted', count: 60, percentage: 24.0 },
      { status: 'under_review', label: 'Under Review', count: 45, percentage: 18.0 },
      { status: 'shortlisted', label: 'Shortlisted', count: 35, percentage: 14.0 },
      { status: 'interview_scheduled', label: 'Interview Scheduled', count: 30, percentage: 12.0 },
      { status: 'selected', label: 'Selected & Offered', count: 45, percentage: 18.0 },
      { status: 'rejected', label: 'Not Selected', count: 25, percentage: 10.0 },
      { status: 'withdrawn', label: 'Withdrawn', count: 10, percentage: 4.0 },
    ],
    companyApplications: [
      { companyName: 'Google', applicationCount: 85, percentage: 34.0 },
      { companyName: 'Microsoft', applicationCount: 65, percentage: 26.0 },
      { companyName: 'Amazon', applicationCount: 50, percentage: 20.0 },
    ],
    recentApplications: [
      {
        id: 'app_rec_01',
        student: { id: 'usr_01', name: 'Alice Walker', email: 'alice@college.edu' },
        listing: {
          id: 'list_01',
          companyName: 'Google',
          title: 'SWE Intern',
          opportunityType: 'internship',
          location: 'Bangalore',
        },
        status: 'interview_scheduled',
        submittedAt: '2026-10-28T14:30:00Z',
      },
      {
        id: 'app_rec_02',
        student: { id: 'usr_02', name: 'Bob Harris', email: 'bob@college.edu' },
        listing: {
          id: 'list_02',
          companyName: 'Microsoft',
          title: 'Full Stack Engineer',
          opportunityType: 'full_time',
          location: 'Hyderabad',
        },
        status: 'selected',
        submittedAt: '2026-10-27T10:15:00Z',
      },
    ],
    activitySummary: {
      totalListings: 12,
      publishedListings: 8,
      draftListings: 2,
      closedListings: 2,
      opportunitiesByType: {
        internship: 5,
        full_time: 5,
        internship_and_full_time: 2,
      },
      pipelineStages: {
        inReview: 105,
        interviewing: 65,
        selected: 45,
        rejected: 25,
        withdrawn: 10,
      },
    },
    generatedAt: '2026-10-29T00:00:00.000Z',
  };

  const emptyAnalyticsData: DashboardAnalyticsData = {
    kpis: {
      totalStudents: 0,
      activeOpportunities: 0,
      totalApplications: 0,
      selectedStudents: 0,
      totalOffers: 0,
      placementRate: 0,
      selectionRate: 0,
    },
    statusDistribution: [
      { status: 'submitted', label: 'Submitted', count: 0, percentage: 0 },
      { status: 'under_review', label: 'Under Review', count: 0, percentage: 0 },
      { status: 'shortlisted', label: 'Shortlisted', count: 0, percentage: 0 },
      { status: 'interview_scheduled', label: 'Interview Scheduled', count: 0, percentage: 0 },
      { status: 'selected', label: 'Selected & Offered', count: 0, percentage: 0 },
      { status: 'rejected', label: 'Not Selected', count: 0, percentage: 0 },
      { status: 'withdrawn', label: 'Withdrawn', count: 0, percentage: 0 },
    ],
    companyApplications: [],
    recentApplications: [],
    activitySummary: {
      totalListings: 0,
      publishedListings: 0,
      draftListings: 0,
      closedListings: 0,
      opportunitiesByType: {
        internship: 0,
        full_time: 0,
        internship_and_full_time: 0,
      },
      pipelineStages: {
        inReview: 0,
        interviewing: 0,
        selected: 0,
        rejected: 0,
        withdrawn: 0,
      },
    },
    generatedAt: '2026-10-29T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const setupAuthenticatedUser = (
    user: typeof mockStudentUser | typeof mockAdminUser,
    analyticsData: DashboardAnalyticsData = mockAnalyticsData
  ) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'valid_jwt');

    vi.spyOn(apiClient, 'get').mockImplementation((url) => {
      if (url === '/auth/me') {
        return Promise.resolve({ data: { success: true, data: { user } } });
      }
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { success: true, data: { unreadCount: 0 } } });
      }
      if (url === '/notifications?page=1&limit=5') {
        return Promise.resolve({ data: { success: true, data: { notifications: [], unreadCount: 0 } } });
      }
      if (url === '/analytics/dashboard') {
        return Promise.resolve({
          data: {
            success: true,
            data: analyticsData,
          },
        });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });
  };

  describe('Student Dashboard Workspace (Preservation)', () => {
    it('renders student workspace with quick action links to profile, listings, and applications', async () => {
      setupAuthenticatedUser(mockStudentUser);
      window.history.pushState({}, 'Dashboard', '/dashboard');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-welcome')).toHaveTextContent(/Welcome back, Emily Davis/i);
      });

      expect(screen.getByTestId('user-role-badge')).toHaveTextContent('student');
      expect(screen.getByTestId('student-dashboard-container')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-profile-link')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-listings-link')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-applications-link')).toBeInTheDocument();

      // Student view should NOT render admin analytics
      expect(screen.queryByTestId('admin-dashboard-container')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kpi-cards-grid')).not.toBeInTheDocument();
    });
  });

  describe('Admin Dashboard & Placement Analytics Rendering', () => {
    it('renders admin dashboard with all 5 KPI metrics, deduplicated selections, and rates', async () => {
      setupAuthenticatedUser(mockAdminUser);
      window.history.pushState({}, 'Dashboard', '/dashboard');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-welcome')).toHaveTextContent(/Welcome back, TPO Director/i);
      });

      expect(screen.getByTestId('user-role-badge')).toHaveTextContent('admin');
      expect(screen.getByTestId('admin-dashboard-container')).toBeInTheDocument();

      // Verify all 5 KPI cards
      await waitFor(() => {
        expect(screen.getByTestId('kpi-total-students')).toHaveTextContent('120');
        expect(screen.getByTestId('kpi-active-opportunities')).toHaveTextContent('8');
        expect(screen.getByTestId('kpi-total-applications')).toHaveTextContent('250');
        expect(screen.getByTestId('kpi-selected-students')).toHaveTextContent('40');
        expect(screen.getByTestId('kpi-placement-rate')).toHaveTextContent('33.3%');
        expect(screen.getByTestId('kpi-selection-rate')).toHaveTextContent('18%');
      });
    });

    it('renders application status distribution chart with all 7 statuses', async () => {
      setupAuthenticatedUser(mockAdminUser);
      window.history.pushState({}, 'Dashboard', '/dashboard');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('status-distribution-chart')).toBeInTheDocument();
      });

      expect(screen.getByTestId('status-item-submitted')).toBeInTheDocument();
      expect(screen.getByTestId('status-count-submitted')).toHaveTextContent('60');

      expect(screen.getByTestId('status-item-under_review')).toBeInTheDocument();
      expect(screen.getByTestId('status-count-under_review')).toHaveTextContent('45');

      expect(screen.getByTestId('status-item-shortlisted')).toBeInTheDocument();
      expect(screen.getByTestId('status-count-shortlisted')).toHaveTextContent('35');

      expect(screen.getByTestId('status-item-interview_scheduled')).toBeInTheDocument();
      expect(screen.getByTestId('status-count-interview_scheduled')).toHaveTextContent('30');

      expect(screen.getByTestId('status-item-selected')).toBeInTheDocument();
      expect(screen.getByTestId('status-count-selected')).toHaveTextContent('45');

      expect(screen.getByTestId('status-item-rejected')).toBeInTheDocument();
      expect(screen.getByTestId('status-count-rejected')).toHaveTextContent('25');

      expect(screen.getByTestId('status-item-withdrawn')).toBeInTheDocument();
      expect(screen.getByTestId('status-count-withdrawn')).toHaveTextContent('10');
    });

    it('renders company-wise application counts chart with top recruiters', async () => {
      setupAuthenticatedUser(mockAdminUser);
      window.history.pushState({}, 'Dashboard', '/dashboard');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('company-applications-chart')).toBeInTheDocument();
      });

      const chart = screen.getByTestId('company-applications-chart');
      expect(within(chart).getByText('Google')).toBeInTheDocument();
      expect(within(chart).getByText('85')).toBeInTheDocument();

      expect(within(chart).getByText('Microsoft')).toBeInTheDocument();
      expect(within(chart).getByText('65')).toBeInTheDocument();

      expect(within(chart).getByText('Amazon')).toBeInTheDocument();
      expect(within(chart).getByText('50')).toBeInTheDocument();
    });

    it('renders recent applications feed with candidate, company, status, and opportunity details', async () => {
      setupAuthenticatedUser(mockAdminUser);
      window.history.pushState({}, 'Dashboard', '/dashboard');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('recent-applications-feed')).toBeInTheDocument();
      });

      const feed = screen.getByTestId('recent-applications-feed');
      expect(within(feed).getByText('Alice Walker')).toBeInTheDocument();
      expect(within(feed).getByText('alice@college.edu')).toBeInTheDocument();
      expect(within(feed).getByText('SWE Intern')).toBeInTheDocument();

      expect(within(feed).getByText('Bob Harris')).toBeInTheDocument();
      expect(within(feed).getByText('bob@college.edu')).toBeInTheDocument();
      expect(within(feed).getByText('Full Stack Engineer')).toBeInTheDocument();
    });

    it('renders placement activity summary with drive breakdown and pipeline stages', async () => {
      setupAuthenticatedUser(mockAdminUser);
      window.history.pushState({}, 'Dashboard', '/dashboard');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('activity-summary-panel')).toBeInTheDocument();
      });

      expect(screen.getByTestId('summary-type-internship')).toHaveTextContent('5');
      expect(screen.getByTestId('summary-type-fulltime')).toHaveTextContent('5');
      expect(screen.getByTestId('summary-type-dual')).toHaveTextContent('2');

      expect(screen.getByTestId('summary-stage-in-review')).toHaveTextContent('105');
      expect(screen.getByTestId('summary-stage-interviewing')).toHaveTextContent('65');
      expect(screen.getByTestId('summary-stage-selected')).toHaveTextContent('45');
    });

    it('triggers manual data refresh when refresh button is clicked', async () => {
      setupAuthenticatedUser(mockAdminUser);
      window.history.pushState({}, 'Dashboard', '/dashboard');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-refresh-analytics-btn')).toBeInTheDocument();
      });

      const refreshBtn = screen.getByTestId('admin-refresh-analytics-btn');
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByTestId('kpi-total-students')).toHaveTextContent('120');
      });
    });
  });

  describe('Empty Datasets & Edge Case Handling', () => {
    it('gracefully handles empty datasets (0 students, 0 listings, 0 applications) without NaN', async () => {
      setupAuthenticatedUser(mockAdminUser, emptyAnalyticsData);
      window.history.pushState({}, 'Dashboard', '/dashboard');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('kpi-total-students')).toHaveTextContent('0');
        expect(screen.getByTestId('kpi-active-opportunities')).toHaveTextContent('0');
        expect(screen.getByTestId('kpi-total-applications')).toHaveTextContent('0');
        expect(screen.getByTestId('kpi-selected-students')).toHaveTextContent('0');
        expect(screen.getByTestId('kpi-placement-rate')).toHaveTextContent('0%');
        expect(screen.getByTestId('kpi-selection-rate')).toHaveTextContent('0%');
      });

      // Status chart handles empty applications
      expect(screen.getByText(/No student applications submitted yet/i)).toBeInTheDocument();

      // Company chart handles empty data
      expect(screen.getByText(/No company application data available/i)).toBeInTheDocument();

      // Recent feed handles empty data
      expect(screen.getByText(/No applications on record/i)).toBeInTheDocument();
    });
  });

  describe('Error State & Recovery', () => {
    it('displays error banner and retry button when analytics API fails', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'valid_jwt');

      vi.spyOn(apiClient, 'get').mockImplementation((url) => {
        if (url === '/auth/me') {
          return Promise.resolve({ data: { success: true, data: { user: mockAdminUser } } });
        }
        if (url === '/notifications/unread-count') {
          return Promise.resolve({ data: { success: true, data: { unreadCount: 0 } } });
        }
        if (url === '/notifications?page=1&limit=5') {
          return Promise.resolve({ data: { success: true, data: { notifications: [], unreadCount: 0 } } });
        }
        if (url === '/analytics/dashboard') {
          return Promise.reject(new Error('Network error: placement analytics service unavailable'));
        }
        return Promise.reject(new Error(`Unhandled GET url: ${url}`));
      });

      window.history.pushState({}, 'Dashboard', '/dashboard');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('analytics-error')).toBeInTheDocument();
      });

      expect(screen.getByText(/Failed to Load Placement Analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/placement analytics service unavailable/i)).toBeInTheDocument();
      expect(screen.getByTestId('analytics-retry-btn')).toBeInTheDocument();

      // Mock subsequent success upon retry
      vi.spyOn(apiClient, 'get').mockImplementation((url) => {
        if (url === '/auth/me') {
          return Promise.resolve({ data: { success: true, data: { user: mockAdminUser } } });
        }
        if (url === '/notifications/unread-count') {
          return Promise.resolve({ data: { success: true, data: { unreadCount: 0 } } });
        }
        if (url === '/notifications?page=1&limit=5') {
          return Promise.resolve({ data: { success: true, data: { notifications: [], unreadCount: 0 } } });
        }
        if (url === '/analytics/dashboard') {
          return Promise.resolve({ data: { success: true, data: mockAnalyticsData } });
        }
        return Promise.reject(new Error(`Unhandled GET url: ${url}`));
      });

      fireEvent.click(screen.getByTestId('analytics-retry-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('analytics-error')).not.toBeInTheDocument();
        expect(screen.getByTestId('kpi-total-students')).toHaveTextContent('120');
      });
    });
  });
});
