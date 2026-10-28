import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { apiClient, TOKEN_STORAGE_KEY } from '../api/client';

describe('Student Profile Management Flow (/profile)', () => {
  const mockUser = {
    id: 'usr_student_01',
    name: 'Emily Davis',
    email: 'emily@college.edu',
    role: 'student' as const,
    createdAt: '2026-10-28T10:00:00Z',
    updatedAt: '2026-10-28T10:00:00Z',
  };

  const mockInitialProfile = {
    id: 'prof_01',
    userId: 'usr_student_01',
    name: 'Emily Davis',
    email: 'emily@college.edu',
    role: 'student' as const,
    phone: '9876543210',
    avatarUrl: '',
    institution: 'College of Engineering',
    department: 'Computer Science',
    degree: 'B.Tech',
    graduationYear: 2026,
    cgpa: 8.9,
    rollNumber: 'CS2022_05',
    skills: ['React', 'TypeScript'],
    bio: 'Passionate full-stack student developer seeking software engineering internships.',
    linkedInUrl: 'https://linkedin.com/in/emily-davis',
    githubUrl: 'https://github.com/emily-davis',
    portfolioUrl: 'https://emilydavis.dev',
    resumeStatus: 'not_uploaded' as const,
    resumeUrl: '',
    createdAt: '2026-10-28T10:00:00Z',
    updatedAt: '2026-10-28T10:00:00Z',
  };

  const mockCompletion = {
    percentage: 100,
    completedFields: [
      'Full Name',
      'Phone Number',
      'Roll / Registration Number',
      'Institution / College',
      'Department / Branch',
      'Degree',
      'Graduation Year',
      'Cumulative GPA (CGPA)',
      'Skills & Proficiencies',
      'Short Biography',
    ],
    missingFields: [],
    isComplete: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const setupAuthenticatedStudent = () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'valid_student_jwt');

    // Mock GET /auth/me for AuthProvider initialization
    vi.spyOn(apiClient, 'get').mockImplementation((url) => {
      if (url === '/auth/me') {
        return Promise.resolve({
          data: {
            success: true,
            data: { user: mockUser },
          },
        });
      }
      if (url === '/profile/me') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              profile: mockInitialProfile,
              completion: mockCompletion,
            },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });
  };

  it('redirects unauthenticated user accessing /profile to /login', async () => {
    window.history.pushState({}, 'Profile', '/profile');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome to CampuSync/i })).toBeInTheDocument();
      expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
    });
  });

  it('loads and renders student profile with prefilled data and completion percentage', async () => {
    setupAuthenticatedStudent();
    window.history.pushState({}, 'Profile', '/profile');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-heading')).toBeInTheDocument();
    });

    expect(screen.getByTestId('completion-percentage')).toHaveTextContent('100%');
    expect(screen.getByTestId('input-name')).toHaveValue('Emily Davis');
    expect(screen.getByTestId('input-email')).toHaveValue('emily@college.edu');
    expect(screen.getByTestId('input-email')).toBeDisabled();
    expect(screen.getByTestId('input-phone')).toHaveValue('9876543210');
    expect(screen.getByTestId('input-institution')).toHaveValue('College of Engineering');
    expect(screen.getByTestId('input-department')).toHaveValue('Computer Science');
    expect(screen.getByTestId('input-degree')).toHaveValue('B.Tech');
    expect(screen.getByTestId('input-gradyear')).toHaveValue(2026);
    expect(screen.getByTestId('input-cgpa')).toHaveValue(8.9);
    expect(screen.getByTestId('input-rollnumber')).toHaveValue('CS2022_05');
    expect(screen.getByTestId('input-bio')).toHaveValue(
      'Passionate full-stack student developer seeking software engineering internships.'
    );

    // Verify skills tags
    expect(screen.getByTestId('skill-tag-0')).toHaveTextContent('React');
    expect(screen.getByTestId('skill-tag-1')).toHaveTextContent('TypeScript');

    // Resume status badge
    expect(screen.getByTestId('resume-status-badge')).toHaveTextContent(/not uploaded/i);
  });

  it('displays missing required fields when completion is less than 100%', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'valid_student_jwt');

    const incompleteProfile = {
      ...mockInitialProfile,
      phone: '',
      cgpa: null,
      skills: [],
      bio: '',
    };

    const incompleteResult = {
      percentage: 60,
      completedFields: ['Full Name', 'Roll / Registration Number', 'Institution / College', 'Department / Branch', 'Degree', 'Graduation Year'],
      missingFields: ['Phone Number', 'Cumulative GPA (CGPA)', 'Skills & Proficiencies', 'Short Biography'],
      isComplete: false,
    };

    vi.spyOn(apiClient, 'get').mockImplementation((url) => {
      if (url === '/auth/me') {
        return Promise.resolve({ data: { success: true, data: { user: mockUser } } });
      }
      if (url === '/profile/me') {
        return Promise.resolve({
          data: {
            success: true,
            data: { profile: incompleteProfile, completion: incompleteResult },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    window.history.pushState({}, 'Profile', '/profile');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('completion-percentage')).toHaveTextContent('60%');
    });

    const missingList = screen.getByTestId('missing-fields-list');
    expect(missingList).toBeInTheDocument();
    expect(missingList).toHaveTextContent(/Phone Number/i);
    expect(missingList).toHaveTextContent(/Cumulative GPA \(CGPA\)/i);
    expect(missingList).toHaveTextContent(/Skills & Proficiencies/i);
    expect(missingList).toHaveTextContent(/Short Biography/i);
  });

  it('allows adding and removing skill tags dynamically', async () => {
    setupAuthenticatedStudent();
    window.history.pushState({}, 'Profile', '/profile');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('input-skill')).toBeInTheDocument();
    });

    const skillInput = screen.getByTestId('input-skill');
    const addSkillBtn = screen.getByTestId('add-skill-btn');

    // Add Python
    fireEvent.change(skillInput, { target: { value: 'Python' } });
    fireEvent.click(addSkillBtn);

    expect(screen.getByTestId('skill-tag-2')).toHaveTextContent('Python');

    // Remove React (index 0)
    const removeBtn = screen.getByRole('button', { name: /Remove React/i });
    fireEvent.click(removeBtn);

    // React should no longer be in the list
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });

  it('successfully submits updated profile and updates view and auth state', async () => {
    setupAuthenticatedStudent();

    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Student profile updated successfully',
        data: {
          profile: {
            ...mockInitialProfile,
            name: 'Emily Davis Updated',
            cgpa: 9.25,
            phone: '9998887776',
            skills: ['React', 'TypeScript', 'Node.js'],
          },
          completion: mockCompletion,
        },
      },
    });

    window.history.pushState({}, 'Profile', '/profile');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
    });

    // Change fields
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Emily Davis Updated' } });
    fireEvent.change(screen.getByTestId('input-cgpa'), { target: { value: '9.25' } });
    fireEvent.change(screen.getByTestId('input-phone'), { target: { value: '9998887776' } });

    // Submit
    fireEvent.click(screen.getByTestId('save-profile-btn'));

    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledTimes(1);
    });

    expect(putSpy).toHaveBeenCalledWith(
      '/profile/me',
      expect.objectContaining({
        name: 'Emily Davis Updated',
        cgpa: 9.25,
        phone: '9998887776',
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('profile-success-alert')).toHaveTextContent(
        /Student profile updated successfully!/i
      );
    });

    expect(screen.getByTestId('profile-name-display')).toHaveTextContent('Emily Davis Updated');
  });

  it('rejects invalid CGPA greater than 10.0 before sending request', async () => {
    setupAuthenticatedStudent();
    const putSpy = vi.spyOn(apiClient, 'put');

    window.history.pushState({}, 'Profile', '/profile');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('input-cgpa')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-cgpa'), { target: { value: '11.5' } });
    fireEvent.click(screen.getByTestId('save-profile-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-error-alert')).toHaveTextContent(
        /CGPA must be a valid number between 0.00 and 10.00/i
      );
    });

    expect(putSpy).not.toHaveBeenCalled();
  });

  it('displays error message when backend returns an error', async () => {
    setupAuthenticatedStudent();

    vi.spyOn(apiClient, 'put').mockRejectedValueOnce(
      new Error('Failed to update: Network timeout')
    );

    window.history.pushState({}, 'Profile', '/profile');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('save-profile-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('save-profile-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-error-alert')).toHaveTextContent(
        /Failed to update: Network timeout/i
      );
    });
  });

  it('discards unsaved modifications when reset is clicked', async () => {
    setupAuthenticatedStudent();
    window.history.pushState({}, 'Profile', '/profile');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('input-phone')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-phone'), { target: { value: '0000000000' } });
    expect(screen.getByTestId('input-phone')).toHaveValue('0000000000');

    fireEvent.click(screen.getByTestId('reset-profile-btn'));

    expect(screen.getByTestId('input-phone')).toHaveValue('9876543210');
  });

  it('navigates to /profile from dashboard link', async () => {
    setupAuthenticatedStudent();
    window.history.pushState({}, 'Dashboard', '/dashboard');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-profile-link')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('dashboard-profile-link'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-heading')).toBeInTheDocument();
    });
  });
});
