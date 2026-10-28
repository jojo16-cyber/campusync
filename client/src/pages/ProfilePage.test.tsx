import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { apiClient, TOKEN_STORAGE_KEY } from '../api/client';
import { ENGINEERING_BRANCHES } from './ProfilePage';

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

  const mockResume = {
    id: 'res_01',
    student: 'usr_student_01',
    originalName: 'Emily_Davis_Resume.pdf',
    fileSize: 1048576, // 1.0 MB
    mimeType: 'application/pdf',
    version: 1,
    isCurrent: true,
    uploadedAt: '2026-10-28T12:00:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const setupAuthenticatedStudent = (
    profileData = mockInitialProfile,
    completionData = mockCompletion,
    resumeRecord: typeof mockResume | null = null
  ) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'valid_student_jwt');

    // Mock GET requests
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
              profile: profileData,
              completion: completionData,
            },
          },
        });
      }
      if (url === '/resumes/me') {
        if (resumeRecord) {
          return Promise.resolve({
            data: {
              success: true,
              data: { resume: resumeRecord },
            },
          });
        }
        return Promise.reject({ response: { status: 404 } });
      }
      if (url.includes('/notifications')) {
        return Promise.resolve({
          data: {
            success: true,
            data: { unreadCount: 0, notifications: [] },
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

  it('renders all 10 engineering branches in the department dropdown and preserves existing custom department', async () => {
    setupAuthenticatedStudent();
    window.history.pushState({}, 'Profile', '/profile');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('input-department')).toBeInTheDocument();
    });

    const selectEl = screen.getByTestId('input-department') as HTMLSelectElement;
    // Since mockInitialProfile has department: 'Computer Science' which is legacy/custom,
    // it should be retained via the custom record option
    expect(selectEl.value).toBe('Computer Science');
    expect(screen.getByTestId('custom-branch-option')).toHaveTextContent('Computer Science (Current Record)');

    // Verify all 10 branches are listed as options
    ENGINEERING_BRANCHES.forEach((branch) => {
      expect(screen.getByRole('option', { name: branch })).toBeInTheDocument();
    });
  });

  it('allows selecting a branch from dropdown and updating expected graduation year to 2027', async () => {
    setupAuthenticatedStudent();

    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Student profile updated successfully',
        data: {
          profile: {
            ...mockInitialProfile,
            department: 'Electronics and Communication Engineering (ECE)',
            graduationYear: 2027,
          },
          completion: mockCompletion,
        },
      },
    });

    window.history.pushState({}, 'Profile', '/profile');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('input-department')).toBeInTheDocument();
    });

    // Select ECE
    fireEvent.change(screen.getByTestId('input-department'), {
      target: { value: 'Electronics and Communication Engineering (ECE)' },
    });
    // Set Expected Graduation Year to 2027
    fireEvent.change(screen.getByTestId('input-gradyear'), {
      target: { value: '2027' },
    });

    // Save profile
    fireEvent.click(screen.getByTestId('save-profile-btn'));

    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledTimes(1);
    });

    expect(putSpy).toHaveBeenCalledWith(
      '/profile/me',
      expect.objectContaining({
        department: 'Electronics and Communication Engineering (ECE)',
        graduationYear: 2027,
      })
    );
  });

  it('rejects graduation year outside the valid range', async () => {
    setupAuthenticatedStudent();
    const putSpy = vi.spyOn(apiClient, 'put');

    window.history.pushState({}, 'Profile', '/profile');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('input-gradyear')).toBeInTheDocument();
    });

    // Test year in the distant past (e.g. 1995)
    fireEvent.change(screen.getByTestId('input-gradyear'), { target: { value: '1995' } });
    fireEvent.click(screen.getByTestId('save-profile-btn'));

    const currentYear = new Date().getFullYear();
    await waitFor(() => {
      expect(screen.getByTestId('profile-error-alert')).toHaveTextContent(
        `Expected graduation year must be between 2000 and ${currentYear + 10}`
      );
    });

    expect(putSpy).not.toHaveBeenCalled();
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

  describe('Phase 6: Resume Uploads & Document Management', () => {
    it('renders active resume metadata and actions when student has an uploaded resume', async () => {
      setupAuthenticatedStudent(mockInitialProfile, mockCompletion, mockResume);
      window.history.pushState({}, 'Profile', '/profile');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('current-resume-name')).toBeInTheDocument();
      });

      expect(screen.getByTestId('current-resume-name')).toHaveTextContent('Emily_Davis_Resume.pdf');
      expect(screen.getByTestId('current-resume-size')).toHaveTextContent('1024.0 KB');
      expect(screen.getByTestId('current-resume-date')).toHaveTextContent(/Uploaded on/i);
      expect(screen.getByTestId('download-resume-btn')).toBeInTheDocument();
      expect(screen.getByTestId('replace-resume-btn')).toBeInTheDocument();
      expect(screen.getByTestId('delete-resume-btn')).toBeInTheDocument();
      expect(screen.getByTestId('resume-status-badge')).toHaveTextContent(/uploaded/i);
    });

    it('allows selecting a valid PDF file and shows selected file info', async () => {
      setupAuthenticatedStudent();
      window.history.pushState({}, 'Profile', '/profile');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('resume-file-input')).toBeInTheDocument();
      });

      const file = new File(['%PDF-1.4 test content'], 'sample_resume.pdf', {
        type: 'application/pdf',
      });
      const input = screen.getByTestId('resume-file-input');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('selected-file-name')).toHaveTextContent('sample_resume.pdf');
        expect(screen.getByTestId('upload-resume-btn')).toBeInTheDocument();
      });
    });

    it('rejects invalid non-PDF file formats with inline error', async () => {
      setupAuthenticatedStudent();
      window.history.pushState({}, 'Profile', '/profile');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('resume-file-input')).toBeInTheDocument();
      });

      const invalidFile = new File(['image bytes'], 'photo.png', {
        type: 'image/png',
      });
      const input = screen.getByTestId('resume-file-input');

      fireEvent.change(input, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('resume-error-msg')).toHaveTextContent(/Invalid file format/i);
      });
      expect(screen.queryByTestId('upload-resume-btn')).not.toBeInTheDocument();
    });

    it('rejects files exceeding 5 MB limit with inline error', async () => {
      setupAuthenticatedStudent();
      window.history.pushState({}, 'Profile', '/profile');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('resume-file-input')).toBeInTheDocument();
      });

      // Construct oversized file (> 5 MB)
      const oversizedFile = new File(['oversized content'], 'huge_resume.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(oversizedFile, 'size', { value: 6 * 1024 * 1024 });

      const input = screen.getByTestId('resume-file-input');
      fireEvent.change(input, { target: { files: [oversizedFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('resume-error-msg')).toHaveTextContent(/exceeds 5 MB limit/i);
      });
    });

    it('successfully uploads PDF resume and updates UI without full page reload', async () => {
      setupAuthenticatedStudent();
      window.history.pushState({}, 'Profile', '/profile');

      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            resume: mockResume,
          },
        },
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('resume-file-input')).toBeInTheDocument();
      });

      const file = new File(['%PDF-1.4 dummy'], 'Emily_Davis_Resume.pdf', {
        type: 'application/pdf',
      });
      fireEvent.change(screen.getByTestId('resume-file-input'), { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('upload-resume-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('upload-resume-btn'));

      await waitFor(() => {
        expect(postSpy).toHaveBeenCalled();
        expect(screen.getByTestId('resume-success-msg')).toHaveTextContent(
          /Resume document uploaded and verified successfully/i
        );
      });

      expect(screen.getByTestId('current-resume-name')).toHaveTextContent('Emily_Davis_Resume.pdf');
    });

    it('downloads resume when download button is clicked', async () => {
      setupAuthenticatedStudent(mockInitialProfile, mockCompletion, mockResume);
      window.history.pushState({}, 'Profile', '/profile');

      const downloadSpy = vi.spyOn(apiClient, 'get').mockImplementation((url) => {
        if (url === '/auth/me') {
          return Promise.resolve({ data: { success: true, data: { user: mockUser } } });
        }
        if (url === '/profile/me') {
          return Promise.resolve({
            data: { success: true, data: { profile: mockInitialProfile, completion: mockCompletion } },
          });
        }
        if (url === '/resumes/me') {
          return Promise.resolve({ data: { success: true, data: { resume: mockResume } } });
        }
        if (url === '/resumes/me/download') {
          return Promise.resolve({
            data: new Blob(['%PDF-1.4 content'], { type: 'application/pdf' }),
            headers: { 'content-disposition': 'attachment; filename="Emily_Davis_Resume.pdf"' },
          });
        }
        return Promise.reject(new Error(`Unhandled GET: ${url}`));
      });

      // Mock URL.createObjectURL and URL.revokeObjectURL
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('download-resume-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('download-resume-btn'));

      await waitFor(() => {
        expect(downloadSpy).toHaveBeenCalledWith('/resumes/me/download', {
          responseType: 'blob',
        });
      });
    });

    it('opens delete confirmation modal and confirms deletion of resume', async () => {
      setupAuthenticatedStudent(mockInitialProfile, mockCompletion, mockResume);
      window.history.pushState({}, 'Profile', '/profile');

      const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
        data: { success: true, message: 'Resume deleted successfully' },
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('delete-resume-btn')).toBeInTheDocument();
      });

      // Click delete button to open modal
      fireEvent.click(screen.getByTestId('delete-resume-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('delete-resume-modal')).toBeInTheDocument();
      });

      // Confirm deletion
      fireEvent.click(screen.getByTestId('confirm-delete-resume-btn'));

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith('/resumes/me');
        expect(screen.getByTestId('resume-success-msg')).toHaveTextContent(
          /Resume deleted successfully/i
        );
      });

      // Active resume card is removed, empty state shown
      expect(screen.queryByTestId('current-resume-name')).not.toBeInTheDocument();
      expect(screen.getByText(/No active resume uploaded/i)).toBeInTheDocument();
    });

    it('displays recruitment disclaimer note', async () => {
      setupAuthenticatedStudent();
      window.history.pushState({}, 'Profile', '/profile');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Recruitment Note:/i)).toBeInTheDocument();
      });
    });
  });
});
