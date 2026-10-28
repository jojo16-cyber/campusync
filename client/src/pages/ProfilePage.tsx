import React, { useState, useEffect, FormEvent, KeyboardEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchMyProfile,
  updateMyProfile,
  StudentProfileData,
  ProfileCompletionResult,
  UpdateProfilePayload,
} from '../api/profile';
import {
  fetchMyResume,
  uploadResume,
  downloadMyResume,
  deleteMyResume,
  ResumeData,
} from '../api/resumes';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Building,
  BookOpen,
  Calendar,
  Award,
  Hash,
  Sparkles,
  FileText,
  Linkedin,
  Github,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  Save,
  RotateCcw,
  Plus,
  X,
  Lock,
  Upload,
  Download,
  Trash2,
  FileCheck,
  Info,
  FileUp,
} from 'lucide-react';

const SUGGESTED_SKILLS = [
  'React',
  'TypeScript',
  'Node.js',
  'Python',
  'Java',
  'MongoDB',
  'SQL',
  'Docker',
  'AWS',
  'Git',
  'Data Structures',
  'Tailwind CSS',
];

export const ENGINEERING_BRANCHES = [
  'Computer Science and Engineering (CSE)',
  'Information Technology (IT)',
  'Electronics and Communication Engineering (ECE)',
  'Electrical and Electronics Engineering (EEE)',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Aerospace Engineering',
  'Biotechnology',
  'Instrumentation and Control Engineering',
] as const;

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Profile data from backend
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [completion, setCompletion] = useState<ProfileCompletionResult | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [institution, setInstitution] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [degree, setDegree] = useState<string>('');
  const [graduationYear, setGraduationYear] = useState<string>('');
  const [cgpa, setCgpa] = useState<string>('');
  const [rollNumber, setRollNumber] = useState<string>('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [linkedInUrl, setLinkedInUrl] = useState<string>('');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [portfolioUrl, setPortfolioUrl] = useState<string>('');

  // Resume Management State (Phase 6)
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeSuccess, setResumeSuccess] = useState<string | null>(null);
  const [isDeleteResumeModalOpen, setIsDeleteResumeModalOpen] = useState<boolean>(false);
  const [deletingResume, setDeletingResume] = useState<boolean>(false);
  const [downloadingResume, setDownloadingResume] = useState<boolean>(false);
  const [isReplacingResume, setIsReplacingResume] = useState<boolean>(false);

  // Initial fetch on mount
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMyProfile();
        if (isMounted) {
          populateForm(data.profile, data.completion);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Failed to load profile';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }

      // Fetch active resume metadata
      try {
        const resumeMeta = await fetchMyResume();
        if (isMounted && resumeMeta) {
          setResumeData(resumeMeta);
        }
      } catch {
        // Silently continue if no resume or endpoint not available
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const populateForm = (prof: StudentProfileData, comp: ProfileCompletionResult) => {
    setProfile(prof);
    setCompletion(comp);
    setName(prof.name || '');
    setPhone(prof.phone || '');
    setAvatarUrl(prof.avatarUrl || '');
    setInstitution(prof.institution || '');
    setDepartment(prof.department || '');
    setDegree(prof.degree || '');
    setGraduationYear(prof.graduationYear ? String(prof.graduationYear) : '');
    setCgpa(prof.cgpa !== null && prof.cgpa !== undefined ? String(prof.cgpa) : '');
    setRollNumber(prof.rollNumber || '');
    setSkills(prof.skills || []);
    setBio(prof.bio || '');
    setLinkedInUrl(prof.linkedInUrl || '');
    setGithubUrl(prof.githubUrl || '');
    setPortfolioUrl(prof.portfolioUrl || '');
  };

  const handleReset = () => {
    if (profile && completion) {
      populateForm(profile, completion);
      setError(null);
      setSuccessMessage('Form reset to saved values');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleAddSkill = (skillToAdd?: string) => {
    const target = (skillToAdd || newSkillInput).trim();
    if (!target) return;

    if (skills.some((s) => s.toLowerCase() === target.toLowerCase())) {
      setNewSkillInput('');
      return;
    }

    setSkills([...skills, target]);
    setNewSkillInput('');
  };

  const handleRemoveSkill = (indexToRemove: number) => {
    setSkills(skills.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  // Resume Handlers (Phase 6)
  const handleResumeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResumeError(null);
    setResumeSuccess(null);
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedResumeFile(null);
      return;
    }
    const file = files[0];

    // Client-side quick validation
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setResumeError('Invalid file format. Please select a valid PDF (.pdf) file.');
      setSelectedResumeFile(null);
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setResumeError(
        `Selected file exceeds 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`
      );
      setSelectedResumeFile(null);
      e.target.value = '';
      return;
    }

    setSelectedResumeFile(file);
  };

  const handleUploadResume = async () => {
    if (!selectedResumeFile) {
      setResumeError('Please select a PDF document first.');
      return;
    }

    setUploadingResume(true);
    setUploadProgress(0);
    setResumeError(null);
    setResumeSuccess(null);

    try {
      const uploaded = await uploadResume(selectedResumeFile, (progress) => {
        setUploadProgress(progress);
      });
      setResumeData(uploaded);
      setSelectedResumeFile(null);
      setIsReplacingResume(false);
      setResumeSuccess('Resume document uploaded and verified successfully.');
      if (profile) {
        setProfile({
          ...profile,
          resumeStatus: 'uploaded',
          resumeUrl: '/api/resumes/me/download',
        });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to upload resume document');
      setResumeError(msg);
    } finally {
      setUploadingResume(false);
    }
  };

  const handleDownloadResume = async () => {
    setDownloadingResume(true);
    setResumeError(null);
    try {
      const { blob, filename } = await downloadMyResume();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || resumeData?.originalName || 'my_resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download resume file.';
      setResumeError(msg);
    } finally {
      setDownloadingResume(false);
    }
  };

  const handleDeleteResumeConfirm = async () => {
    setDeletingResume(true);
    setResumeError(null);
    try {
      await deleteMyResume();
      setResumeData(null);
      setIsDeleteResumeModalOpen(false);
      setSelectedResumeFile(null);
      setIsReplacingResume(false);
      setResumeSuccess('Resume deleted successfully.');
      if (profile) {
        setProfile({
          ...profile,
          resumeStatus: 'not_uploaded',
          resumeUrl: '',
        });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to delete resume');
      setResumeError(msg);
    } finally {
      setDeletingResume(false);
    }
  };

  const handleSubmit = async (e: FormEvent | React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Client-side quick validations
    if (cgpa) {
      const parsedCgpa = parseFloat(cgpa);
      if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
        setError('CGPA must be a valid number between 0.00 and 10.00');
        return;
      }
    }

    if (graduationYear) {
      const parsedYear = parseInt(graduationYear, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > currentYear + 10) {
        setError(`Expected graduation year must be between 2000 and ${currentYear + 10}`);
        return;
      }
    }

    setSaving(true);

    const payload: UpdateProfilePayload = {
      name: name.trim(),
      phone: phone.trim(),
      avatarUrl: avatarUrl.trim(),
      institution: institution.trim(),
      department: department.trim(),
      degree: degree.trim(),
      graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
      cgpa: cgpa ? parseFloat(cgpa) : null,
      rollNumber: rollNumber.trim(),
      skills,
      bio: bio.trim(),
      linkedInUrl: linkedInUrl.trim(),
      githubUrl: githubUrl.trim(),
      portfolioUrl: portfolioUrl.trim(),
    };

    try {
      const data = await updateMyProfile(payload);
      populateForm(data.profile, data.completion);

      // Keep AuthContext in sync with updated name
      if (data.profile.name && user?.name !== data.profile.name) {
        updateUser({ name: data.profile.name });
      }

      setSuccessMessage('Student profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An error occurred while saving your profile';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="h-32 bg-slate-100 rounded-xl"></div>
            <div className="h-32 bg-slate-100 rounded-xl"></div>
            <div className="h-32 bg-slate-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const completionPct = completion?.percentage ?? 0;
  const isComplete = completionPct === 100;

  // Completion color classes
  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-blue-500';
    if (pct >= 30) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title & Breadcrumb */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
            data-testid="profile-heading"
          >
            Student Profile Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain your verified academic records, technical skills, and placement credentials.
          </p>
        </div>

        {/* Action Button Bar (Desktop) */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
            data-testid="reset-profile-btn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard Changes</span>
          </button>
          <button
            type="submit"
            form="profile-form"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-60"
            data-testid="save-profile-btn"
          >
            {saving ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving Profile...' : 'Save Profile'}</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {successMessage && (
        <div
          className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center space-x-3 text-emerald-800 text-sm shadow-sm"
          data-testid="profile-success-alert"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center space-x-3 text-rose-800 text-sm shadow-sm"
          data-testid="profile-error-alert"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Completion & Identity Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* User Identification Card */}
          <div className="flex items-center space-x-4 lg:col-span-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md flex-shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name || user?.name || 'Profile'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>{(name || user?.name || 'S').slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate" data-testid="profile-name-display">
                {name || user?.name}
              </h2>
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                  {user?.role || 'student'}
                </span>
                {profile?.rollNumber && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    Roll: {profile.rollNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Completion Meter */}
          <div className="lg:col-span-2 bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Profile Completion Status
                </span>
              </div>
              <span
                className="text-sm font-extrabold text-slate-900 font-mono"
                data-testid="completion-percentage"
              >
                {completionPct}%
              </span>
            </div>

            {/* Progress Bar */}
            <div
              className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner"
              data-testid="completion-bar"
            >
              <div
                className={`h-full transition-all duration-500 rounded-full ${getProgressColor(
                  completionPct
                )}`}
                style={{ width: `${completionPct}%` }}
              ></div>
            </div>

            {/* Missing Requirements Guidance */}
            {completion && !isComplete && completion.missingFields.length > 0 ? (
              <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                <p className="font-semibold text-slate-700 mb-1.5 flex items-center space-x-1">
                  <span>Complete these required fields to reach 100% eligibility:</span>
                </p>
                <div className="flex flex-wrap gap-1.5" data-testid="missing-fields-list">
                  {completion.missingFields.map((field) => (
                    <span
                      key={field}
                      className="px-2 py-0.5 rounded-full text-[11px] bg-rose-50 text-rose-700 border border-rose-200"
                    >
                      &bull; {field}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>All placement eligibility criteria completed! Your profile is verified.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Profile Form */}
      <form id="profile-form" onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Personal Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
              <p className="text-xs text-slate-500">
                Primary contact and identity details used in candidate rosters.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  data-testid="input-name"
                />
              </div>
            </div>

            {/* Email (Readonly) */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between"
              >
                <span>College Email</span>
                <span className="text-[10px] text-slate-400 font-normal flex items-center">
                  <Lock className="w-3 h-3 mr-0.5" /> Immutable
                </span>
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed font-mono"
                  data-testid="input-email"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Linked to college authentication account.
              </p>
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  data-testid="input-phone"
                />
              </div>
            </div>

            {/* Avatar URL */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label
                htmlFor="avatarUrl"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Profile Photo URL
              </label>
              <input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/images/my-avatar.jpg"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                data-testid="input-avatar"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Provide a hosted direct image link for campus identification.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Academic Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Academic Records &amp; Scores</h3>
              <p className="text-xs text-slate-500">
                Official institutional parameters evaluated for company drive cutoffs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Institution */}
            <div>
              <label
                htmlFor="institution"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                College / Institution <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  id="institution"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. National Institute of Technology"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  data-testid="input-institution"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label
                htmlFor="department"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Department / Branch <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <select
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  data-testid="input-department"
                >
                  <option value="">Select Department / Branch</option>
                  {Boolean(
                    department &&
                      !ENGINEERING_BRANCHES.includes(
                        department as (typeof ENGINEERING_BRANCHES)[number]
                      )
                  ) && (
                    <option value={department} data-testid="custom-branch-option">
                      {department} (Current Record)
                    </option>
                  )}
                  {ENGINEERING_BRANCHES.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Select your engineering discipline for placement drive eligibility.
              </p>
            </div>

            {/* Degree */}
            <div>
              <label
                htmlFor="degree"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Degree Program <span className="text-rose-500">*</span>
              </label>
              <input
                id="degree"
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Tech / M.Tech / MCA"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                data-testid="input-degree"
              />
            </div>

            {/* Graduation Year */}
            <div>
              <label
                htmlFor="graduationYear"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Expected Graduation Year <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  id="graduationYear"
                  type="number"
                  min="2000"
                  max={new Date().getFullYear() + 10}
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  placeholder="e.g. 2027"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-mono"
                  data-testid="input-gradyear"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Calendar year your degree will be completed (e.g. 2027).
              </p>
            </div>

            {/* CGPA */}
            <div>
              <label
                htmlFor="cgpa"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Cumulative CGPA (0 - 10) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Award className="w-4 h-4" />
                </div>
                <input
                  id="cgpa"
                  type="number"
                  step="0.01"
                  min="0.00"
                  max="10.00"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  placeholder="8.75"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-mono"
                  data-testid="input-cgpa"
                />
              </div>
            </div>

            {/* Roll / Registration Number */}
            <div>
              <label
                htmlFor="rollNumber"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Roll / Reg. Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  id="rollNumber"
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="2022CS0142"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-mono"
                  data-testid="input-rollnumber"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Professional & Skills */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Skills &amp; Professional Profile</h3>
              <p className="text-xs text-slate-500">
                Showcase technical proficiencies, bio, and social engineering portfolios.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Skills Tag Management */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Technical Skills &amp; Proficiencies <span className="text-rose-500">*</span>
              </label>

              {/* Tag Input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Type a skill (e.g. React, Python) and press Enter or click Add"
                  className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                  data-testid="input-skill"
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill()}
                  className="px-4 py-2.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center space-x-1.5 transition"
                  data-testid="add-skill-btn"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Skill</span>
                </button>
              </div>

              {/* Selected Skills Chips */}
              <div className="flex flex-wrap gap-2 min-h-[38px] p-3 bg-slate-50 rounded-xl border border-slate-200 mb-3">
                {skills.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">
                    No skills added yet. Select from suggestions below or type your own.
                  </span>
                ) : (
                  skills.map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-purple-200 text-purple-900 rounded-lg text-xs font-medium shadow-sm"
                      data-testid={`skill-tag-${index}`}
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(index)}
                        className="text-purple-400 hover:text-rose-600 focus:outline-none"
                        aria-label={`Remove ${skill}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Suggested Quick-Add Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="font-medium mr-1">Suggested:</span>
                {SUGGESTED_SKILLS.map((suggested) => {
                  const isAdded = skills.some(
                    (s) => s.toLowerCase() === suggested.toLowerCase()
                  );
                  if (isAdded) return null;
                  return (
                    <button
                      type="button"
                      key={suggested}
                      onClick={() => handleAddSkill(suggested)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-slate-700 text-[11px] font-medium transition"
                    >
                      + {suggested}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Biography */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="bio"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Short Biography <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {bio.length} / 1000 characters
                </span>
              </div>
              <textarea
                id="bio"
                rows={4}
                maxLength={1000}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a brief overview of your technical interests, project achievements, career goals, or placement aspirations..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                data-testid="input-bio"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Minimum 10 characters required for profile completion score.
              </p>
            </div>

            {/* Social / Portfolio Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              {/* LinkedIn */}
              <div>
                <label
                  htmlFor="linkedInUrl"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
                >
                  LinkedIn Profile
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Linkedin className="w-4 h-4 text-blue-600" />
                  </div>
                  <input
                    id="linkedInUrl"
                    type="url"
                    value={linkedInUrl}
                    onChange={(e) => setLinkedInUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                    data-testid="input-linkedin"
                  />
                </div>
              </div>

              {/* GitHub */}
              <div>
                <label
                  htmlFor="githubUrl"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
                >
                  GitHub Profile
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Github className="w-4 h-4 text-slate-800" />
                  </div>
                  <input
                    id="githubUrl"
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                    data-testid="input-github"
                  />
                </div>
              </div>

              {/* Portfolio */}
              <div>
                <label
                  htmlFor="portfolioUrl"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
                >
                  Personal Portfolio
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Globe className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    id="portfolioUrl"
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourportfolio.dev"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                    data-testid="input-portfolio"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Resume & Secure Document Management (Phase 6) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Placement Resume Document</h3>
                <p className="text-xs text-slate-500">
                  Upload and manage your official PDF resume for verified placement applications.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  resumeData || profile?.resumeStatus === 'verified'
                    ? profile?.resumeStatus === 'verified'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                    : profile?.resumeStatus === 'uploaded'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
                data-testid="resume-status-badge"
              >
                {resumeData
                  ? profile?.resumeStatus === 'verified'
                    ? 'Verified'
                    : 'Uploaded'
                  : profile?.resumeStatus?.replace('_', ' ') || 'Not Uploaded'}
              </span>
            </div>
          </div>

          {/* Feedback messages */}
          {resumeError && (
            <div
              data-testid="resume-error-msg"
              className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2.5"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{resumeError}</span>
            </div>
          )}

          {resumeSuccess && (
            <div
              data-testid="resume-success-msg"
              className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2.5"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{resumeSuccess}</span>
            </div>
          )}

          {/* Active Resume Card */}
          {resumeData ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-rose-600 shadow-xs flex-shrink-0">
                    <FileCheck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4
                      className="text-sm font-bold text-slate-900 break-all"
                      data-testid="current-resume-name"
                    >
                      {resumeData.originalName}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span data-testid="current-resume-size">
                        {(resumeData.fileSize / 1024).toFixed(1)} KB
                      </span>
                      <span>&bull;</span>
                      <span data-testid="current-resume-date">
                        Uploaded on {new Date(resumeData.uploadedAt).toLocaleDateString()}
                      </span>
                      <span>&bull;</span>
                      <span className="font-mono text-[11px] bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-700">
                        v{resumeData.version || 1}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadResume}
                    disabled={downloadingResume}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition shadow-xs disabled:opacity-50"
                    data-testid="download-resume-btn"
                  >
                    {downloadingResume ? (
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsReplacingResume(!isReplacingResume);
                      setSelectedResumeFile(null);
                      setResumeError(null);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs"
                    data-testid="replace-resume-btn"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isReplacingResume ? 'Cancel Replacement' : 'Replace'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDeleteResumeModalOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition shadow-xs"
                    data-testid="delete-resume-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-xl p-5 mb-6 text-center">
              <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No active resume uploaded</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your official PDF curriculum vitae to automatically attach it to recruiter applications.
              </p>
            </div>
          )}

          {/* Upload / Replacement Dropzone */}
          {(!resumeData || isReplacingResume) && (
            <div className="border border-slate-200 rounded-xl p-5 bg-white mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                {resumeData ? 'Upload Replacement Resume' : 'Select Resume Document'}
              </h4>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-6 transition bg-slate-50/50">
                <input
                  type="file"
                  id="resume-file-input"
                  accept="application/pdf"
                  onChange={handleResumeFileSelect}
                  className="hidden"
                  data-testid="resume-file-input"
                  disabled={uploadingResume}
                />
                <label
                  htmlFor="resume-file-input"
                  className="flex flex-col items-center cursor-pointer text-center"
                >
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    Click to select PDF resume
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    PDF format only &bull; Up to 5 MB
                  </span>
                </label>
              </div>

              {/* Selected File Card & Actions */}
              {selectedResumeFile && (
                <div className="mt-4 p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 break-all" data-testid="selected-file-name">
                        {selectedResumeFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500" data-testid="selected-file-size">
                        {(selectedResumeFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedResumeFile(null)}
                      disabled={uploadingResume}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadResume}
                      disabled={uploadingResume}
                      className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-60"
                      data-testid="upload-resume-btn"
                    >
                      {uploadingResume ? (
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{uploadingResume ? 'Uploading...' : 'Upload PDF'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Progress Bar */}
              {uploadingResume && (
                <div className="mt-3" data-testid="upload-progress-container">
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                      data-testid="upload-progress-bar"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 text-center font-medium">
                    Uploading & verifying PDF document signature... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Important Information Notice */}
          <div className="flex items-start space-x-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <p>
              <strong className="text-slate-800">Recruitment Note:</strong> Uploading or replacing
              your resume updates your active profile document. It does not automatically submit a
              new placement application or alter the evaluation stage of previously submitted applications.
            </p>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {isDeleteResumeModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
            data-testid="delete-resume-modal"
          >
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Resume Document</h3>
                  <p className="text-xs text-slate-500">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Are you sure you want to permanently delete your stored resume (
                <span className="font-semibold text-slate-800">
                  {resumeData?.originalName || 'current resume'}
                </span>
                )? Future recruitment opportunity applications will require a new resume document.
              </p>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteResumeModalOpen(false)}
                  disabled={deletingResume}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                  data-testid="cancel-delete-resume-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteResumeConfirm}
                  disabled={deletingResume}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition disabled:opacity-50"
                  data-testid="confirm-delete-resume-btn"
                >
                  {deletingResume && <Clock className="w-3.5 h-3.5 animate-spin" />}
                  <span>{deletingResume ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
          >
            Discard Changes
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition disabled:opacity-60"
          >
            {saving ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
