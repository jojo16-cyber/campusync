import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { apiClient, TOKEN_STORAGE_KEY } from '../api/client';
import { ListingData, EligibilityEvaluationResult } from '../api/listings';

describe('Opportunities & Placement Listings Flow (/listings)', () => {
  const mockStudentUser = {
    id: 'usr_student_01',
    name: 'Maya Patel',
    email: 'maya@college.edu',
    role: 'student' as const,
    createdAt: '2026-10-28T10:00:00Z',
    updatedAt: '2026-10-28T10:00:00Z',
  };

  const mockAdminUser = {
    id: 'usr_admin_01',
    name: 'TPO Director',
    email: 'admin@college.edu',
    role: 'admin' as const,
    createdAt: '2026-10-28T10:00:00Z',
    updatedAt: '2026-10-28T10:00:00Z',
  };

  const mockListings: ListingData[] = [
    {
      id: 'list_01',
      companyName: 'Microsoft',
      title: 'Software Engineer - Cloud Infrastructure',
      description: 'Design and operate large-scale distributed cloud systems with Azure.',
      opportunityType: 'full_time',
      location: 'Hyderabad',
      workArrangement: 'hybrid',
      compensation: '22 LPA',
      employmentType: 'full_time',
      skillsRequired: ['C++', 'Distributed Systems', 'Azure'],
      responsibilities: ['Write high-concurrency microservices', 'Participate in architectural reviews'],
      eligibility: {
        minCgpa: 8.0,
        eligibleDepartments: ['Computer Science', 'Information Technology'],
        eligibleGraduationYears: [2026],
        additionalCriteria: 'No active backlogs',
      },
      applicationOpenDate: '2026-10-01T00:00:00Z',
      applicationDeadline: '2026-11-30T00:00:00Z',
      status: 'published',
      createdBy: 'usr_admin_01',
      createdAt: '2026-10-28T10:00:00Z',
      updatedAt: '2026-10-28T10:00:00Z',
      isExpired: false,
      isOpen: true,
      eligibilityPreview: {
        isEligible: true,
        status: 'eligible',
        summary: 'You meet all academic criteria and the drive is open for applications.',
      },
    },
    {
      id: 'list_02',
      companyName: 'Amazon',
      title: 'Software Development Engineer Intern',
      description: '6-month SDE internship developing backend services for AWS.',
      opportunityType: 'internship',
      location: 'Bangalore',
      workArrangement: 'on_site',
      compensation: '₹80,000 / month',
      employmentType: 'internship',
      skillsRequired: ['Java', 'Algorithms', 'AWS'],
      responsibilities: ['Implement feature specifications', 'Build unit test suites'],
      eligibility: {
        minCgpa: 8.5,
        eligibleDepartments: ['Computer Science'],
        eligibleGraduationYears: [2026],
      },
      applicationOpenDate: '2026-10-01T00:00:00Z',
      applicationDeadline: '2026-12-15T00:00:00Z',
      status: 'published',
      createdBy: 'usr_admin_01',
      createdAt: '2026-10-28T10:00:00Z',
      updatedAt: '2026-10-28T10:00:00Z',
      isExpired: false,
      isOpen: true,
      eligibilityPreview: {
        isEligible: false,
        status: 'ineligible',
        summary: 'You do not meet one or more eligibility criteria for this opportunity.',
      },
    },
  ];

  const mockDetailEligibility: EligibilityEvaluationResult = {
    isEligible: true,
    status: 'eligible',
    summary: 'You meet all academic criteria and the drive is open for applications.',
    criteria: [
      { criterion: 'Cumulative GPA (CGPA)', required: 'Minimum 8.00', actual: '8.85', met: true },
      { criterion: 'Department / Branch', required: 'Computer Science, IT', actual: 'Computer Science', met: true },
      { criterion: 'Graduation Batch', required: 'Class of 2026', actual: 'Class of 2026', met: true },
      { criterion: 'Application Window', required: 'Listing Published & Before Deadline', actual: 'Open until 30/11/2026', met: true },
    ],
    missingProfileFields: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const setupAuthenticatedUser = (
    user: { id: string; name: string; email: string; role: 'student' | 'admin'; createdAt: string; updatedAt: string } = mockStudentUser,
    listingsData = mockListings
  ) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'mock_token');

    vi.spyOn(apiClient, 'get').mockImplementation((url) => {
      if (url === '/auth/me') {
        return Promise.resolve({ data: { success: true, data: { user } } });
      }
      if (url === '/listings') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              listings: listingsData,
              pagination: { total: listingsData.length, page: 1, limit: 6, totalPages: 1 },
            },
          },
        });
      }
      if (url === '/listings/list_01') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              listing: listingsData[0],
              eligibility: mockDetailEligibility,
            },
          },
        });
      }
      if (url === '/applications/me') {
        return Promise.resolve({
          data: {
            success: true,
            data: { applications: [], count: 0 },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });
  };

  it('redirects unauthenticated user accessing /listings to /login', async () => {
    window.history.pushState({}, 'Listings', '/listings');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome to CampuSync/i })).toBeInTheDocument();
      expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
    });
  });

  it('renders opportunities list with company name, compensation, and eligibility tags for students', async () => {
    setupAuthenticatedUser(mockStudentUser);
    window.history.pushState({}, 'Listings', '/listings');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Microsoft')).toBeInTheDocument();
    });

    expect(screen.getByText('Software Engineer - Cloud Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('22 LPA')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('₹80,000 / month')).toBeInTheDocument();

    // Check student eligibility preview tags
    expect(screen.getByText(/Eligible to Apply/i)).toBeInTheDocument();
    expect(screen.getByText(/Not Eligible/i)).toBeInTheDocument();

    // Student must not see admin creation buttons
    expect(screen.queryByTestId('create-listing-btn')).not.toBeInTheDocument();
  });

  it('opens opportunity details modal and renders eligibility breakdown checklist', async () => {
    setupAuthenticatedUser(mockStudentUser);
    window.history.pushState({}, 'Listings', '/listings');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('view-detail-btn-0')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-detail-btn-0'));

    await waitFor(() => {
      expect(screen.getByTestId('listing-detail-modal')).toBeInTheDocument();
    });

    expect(screen.getByTestId('eligibility-status-banner')).toHaveTextContent(
      /You are eligible to apply for this position/i
    );
    expect(screen.getByTestId('eligibility-criteria-list')).toBeInTheDocument();
    expect(screen.getByText(/Minimum 8.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Role Description/i)).toBeInTheDocument();
  });

  it('shows incomplete profile guidance with link to /profile when academic details are missing', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'mock_token');

    const incompleteEligibility: EligibilityEvaluationResult = {
      isEligible: false,
      status: 'incomplete_profile',
      summary: 'Your student profile is missing: Cumulative CGPA, Department / Branch.',
      criteria: [],
      missingProfileFields: ['Cumulative CGPA', 'Department / Branch'],
    };

    vi.spyOn(apiClient, 'get').mockImplementation((url) => {
      if (url === '/auth/me') {
        return Promise.resolve({ data: { success: true, data: { user: mockStudentUser } } });
      }
      if (url === '/listings') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              listings: mockListings,
              pagination: { total: mockListings.length, page: 1, limit: 6, totalPages: 1 },
            },
          },
        });
      }
      if (url === '/listings/list_01') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              listing: mockListings[0],
              eligibility: incompleteEligibility,
            },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    window.history.pushState({}, 'Listings', '/listings');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('view-detail-btn-0')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-detail-btn-0'));

    await waitFor(() => {
      expect(screen.getByTestId('eligibility-status-banner')).toHaveTextContent(/Incomplete Student Profile/i);
    });

    expect(screen.getByTestId('incomplete-profile-link')).toBeInTheDocument();
    expect(screen.getByTestId('incomplete-profile-link')).toHaveAttribute('href', '/profile');
  });

  it('allows administrator to access creation modal and submit new listing', async () => {
    setupAuthenticatedUser(mockAdminUser);

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Opportunity listing created successfully',
        data: {
          listing: {
            ...mockListings[0],
            id: 'list_new_01',
            companyName: 'Apple',
            title: 'iOS Systems Engineer',
          },
        },
      },
    });

    window.history.pushState({}, 'Listings', '/listings');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('create-listing-btn')).toBeInTheDocument();
    });

    // Click Post New Opportunity
    fireEvent.click(screen.getByTestId('create-listing-btn'));

    // Modal opens
    await waitFor(() => {
      expect(screen.getByTestId('input-company-name')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-company-name'), { target: { value: 'Apple' } });
    fireEvent.change(screen.getByTestId('input-title'), { target: { value: 'iOS Systems Engineer' } });

    // Submit form
    fireEvent.click(screen.getByTestId('submit-listing-btn'));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(1);
    });

    expect(postSpy).toHaveBeenCalledWith(
      '/listings',
      expect.objectContaining({
        companyName: 'Apple',
        title: 'iOS Systems Engineer',
      })
    );
  });

  it('allows administrator to delete listing with confirmation', async () => {
    setupAuthenticatedUser(mockAdminUser);

    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Listing deleted successfully',
      },
    });

    window.history.pushState({}, 'Listings', '/listings');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-delete-btn-0')).toBeInTheDocument();
    });

    // Click trash button
    fireEvent.click(screen.getByTestId('admin-delete-btn-0'));

    // Confirm modal opens
    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('confirm-delete-btn'));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('/listings/list_01');
    });
  });

  it('allows eligible student to apply to an opportunity from detail modal', async () => {
    setupAuthenticatedUser(mockStudentUser);

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Application submitted successfully',
        data: {
          application: {
            id: 'app_new_01',
            student: 'usr_student_01',
            listing: { id: 'list_01' },
            status: 'submitted',
            coverLetter: 'Excited about Azure cloud architecture.',
            submittedAt: '2026-10-28T12:00:00Z',
          },
        },
      },
    });

    window.history.pushState({}, 'Listings', '/listings');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('view-detail-btn-0')).toBeInTheDocument();
    });

    // Open Microsoft details
    fireEvent.click(screen.getByTestId('view-detail-btn-0'));

    await waitFor(() => {
      expect(screen.getByTestId('apply-now-btn')).toBeInTheDocument();
    });

    // Click Apply Now
    fireEvent.click(screen.getByTestId('apply-now-btn'));

    expect(screen.getByTestId('cover-letter-input')).toBeInTheDocument();

    // Enter statement
    fireEvent.change(screen.getByTestId('cover-letter-input'), {
      target: { value: 'Excited about Azure cloud architecture.' },
    });

    // Confirm submission
    fireEvent.click(screen.getByTestId('confirm-apply-btn'));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/applications', {
        listingId: 'list_01',
        coverLetter: 'Excited about Azure cloud architecture.',
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('already-applied-banner')).toBeInTheDocument();
      expect(screen.getByText('Application submitted successfully!')).toBeInTheDocument();
    });
  });

  it('displays already-applied banner when student previously applied to the listing', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'mock_token');

    vi.spyOn(apiClient, 'get').mockImplementation((url) => {
      if (url === '/auth/me') {
        return Promise.resolve({ data: { success: true, data: { user: mockStudentUser } } });
      }
      if (url === '/listings') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              listings: mockListings,
              pagination: { total: mockListings.length, page: 1, limit: 6, totalPages: 1 },
            },
          },
        });
      }
      if (url === '/listings/list_01') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              listing: mockListings[0],
              eligibility: mockDetailEligibility,
            },
          },
        });
      }
      if (url === '/applications/me') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              applications: [
                {
                  id: 'app_existing_01',
                  student: 'usr_student_01',
                  listing: { id: 'list_01' },
                  status: 'under_review',
                  submittedAt: '2026-10-28T10:00:00Z',
                },
              ],
              count: 1,
            },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    window.history.pushState({}, 'Listings', '/listings');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('view-detail-btn-0')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-detail-btn-0'));

    await waitFor(() => {
      expect(screen.getByTestId('already-applied-banner')).toBeInTheDocument();
      expect(screen.getByText(/under review/i)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('apply-now-btn')).not.toBeInTheDocument();
  });

  it('allows administrator to open applicants modal and view applicant roster', async () => {
    setupAuthenticatedUser(mockAdminUser);

    const getSpy = vi.spyOn(apiClient, 'get').mockImplementation((url) => {
      if (url === '/auth/me') {
        return Promise.resolve({ data: { success: true, data: { user: mockAdminUser } } });
      }
      if (url === '/listings') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              listings: mockListings,
              pagination: { total: mockListings.length, page: 1, limit: 6, totalPages: 1 },
            },
          },
        });
      }
      if (url === '/listings/list_01/applications') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              listing: { id: 'list_01', title: 'Software Engineer', companyName: 'Microsoft' },
              applications: [
                {
                  id: 'app_cand_01',
                  student: { id: 'cand_01', name: 'Rohan Sharma', email: 'rohan@college.edu' },
                  status: 'submitted',
                  submittedAt: '2026-10-28T09:00:00Z',
                  hasResume: true,
                  studentProfile: {
                    rollNumber: 'CS2022_44',
                    cgpa: 8.9,
                    department: 'Computer Science and Engineering (CSE)',
                    graduationYear: 2026,
                  },
                },
                {
                  id: 'app_cand_02',
                  student: { id: 'cand_02', name: 'Aarav Patel', email: 'aarav@college.edu' },
                  status: 'submitted',
                  submittedAt: '2026-10-28T09:30:00Z',
                  hasResume: false,
                  studentProfile: {
                    rollNumber: 'CS2022_12',
                    cgpa: 8.2,
                    department: 'Information Technology (IT)',
                    graduationYear: 2026,
                  },
                },
              ],
              pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
            },
          },
        });
      }
      if (url === '/applications/app_cand_01/resume') {
        return Promise.resolve({
          data: new Blob(['%PDF-1.4 dummy resume'], { type: 'application/pdf' }),
          headers: { 'content-disposition': 'attachment; filename="rohan_resume.pdf"' },
        });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    window.history.pushState({}, 'Listings', '/listings');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-applicants-btn-0')).toBeInTheDocument();
    });

    // Click Applicants button
    fireEvent.click(screen.getByTestId('admin-applicants-btn-0'));

    await waitFor(() => {
      expect(screen.getByTestId('applicants-modal')).toBeInTheDocument();
    });

    expect(screen.getByText('Rohan Sharma')).toBeInTheDocument();
    expect(screen.getByText(/CGPA: 8.90/i)).toBeInTheDocument();
    expect(screen.getByTestId('status-select-app_cand_01')).toBeInTheDocument();

    // Verify Phase 6 Resume actions
    expect(screen.getByTestId('download-resume-app_cand_01')).toBeInTheDocument();
    expect(screen.getByTestId('no-resume-app_cand_02')).toHaveTextContent(/No resume uploaded/i);

    // Mock URL methods and click download
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-resume');
    window.URL.revokeObjectURL = vi.fn();
    fireEvent.click(screen.getByTestId('download-resume-app_cand_01'));

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('/applications/app_cand_01/resume', {
        responseType: 'blob',
      });
    });
  });

  it('navigates to /listings from student dashboard card', async () => {
    setupAuthenticatedUser(mockStudentUser);
    window.history.pushState({}, 'Dashboard', '/dashboard');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-listings-link')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('dashboard-listings-link'));

    await waitFor(() => {
      expect(screen.getByTestId('listings-heading')).toBeInTheDocument();
    });
  });
});
