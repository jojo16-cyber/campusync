import { apiClient } from './client';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'selected'
  | 'rejected'
  | 'withdrawn';

export interface ApplicationListingSummary {
  id: string;
  companyName: string;
  title: string;
  description?: string;
  opportunityType: string;
  location: string;
  workArrangement: string;
  compensation: string;
  status: string;
  applicationDeadline: string;
}

export interface StudentApplicationData {
  id: string;
  student: string | { id: string; name: string; email: string };
  listing: ApplicationListingSummary;
  status: ApplicationStatus;
  coverLetter?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfileSummary {
  rollNumber: string;
  department: string;
  degree: string;
  graduationYear: number;
  cgpa: number;
  phone: string;
  skills: string[];
  institution?: string;
  bio?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

export interface AdminApplicantData {
  id: string;
  student: { id: string; name: string; email: string; role?: string };
  listing: string | ApplicationListingSummary;
  status: ApplicationStatus;
  coverLetter?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  studentProfile?: StudentProfileSummary | null;
  hasResume?: boolean;
  resume?: {
    originalName: string;
    fileSize: number;
    uploadedAt: string;
  } | null;
}

export interface SubmitApplicationPayload {
  listingId: string;
  coverLetter?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Submit an application to a published placement or internship listing.
 */
export const submitApplication = async (
  payload: SubmitApplicationPayload
): Promise<StudentApplicationData> => {
  const response = await apiClient.post('/applications', payload);
  if (response.data?.success) {
    return response.data.data.application;
  }
  throw new Error(response.data?.message || 'Failed to submit application');
};

/**
 * Fetch all applications submitted by the current authenticated student.
 */
export const fetchMyApplications = async (): Promise<StudentApplicationData[]> => {
  const response = await apiClient.get('/applications/me');
  if (response.data?.success) {
    return response.data.data.applications;
  }
  throw new Error(response.data?.message || 'Failed to load applications');
};

/**
 * Fetch single application detail by ID for the current authenticated student.
 */
export const fetchMyApplicationById = async (
  id: string
): Promise<StudentApplicationData> => {
  const response = await apiClient.get(`/applications/me/${id}`);
  if (response.data?.success) {
    return response.data.data.application;
  }
  throw new Error(response.data?.message || 'Failed to load application details');
};

/**
 * Withdraw an application that is in 'submitted' or 'under_review' status.
 */
export const withdrawApplication = async (
  id: string
): Promise<StudentApplicationData> => {
  const response = await apiClient.patch(`/applications/${id}/withdraw`);
  if (response.data?.success) {
    return response.data.data.application;
  }
  throw new Error(response.data?.message || 'Failed to withdraw application');
};

/**
 * Fetch applicants for a specific listing (Admin / TPO only).
 */
export const fetchListingApplicants = async (
  listingId: string,
  params?: { status?: string; page?: number; limit?: number }
): Promise<{
  listing: { id: string; title: string; companyName: string; status: string };
  applications: AdminApplicantData[];
  pagination: PaginationMeta;
}> => {
  const response = await apiClient.get(`/listings/${listingId}/applications`, {
    params,
  });
  if (response.data?.success) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to load applicants');
};

/**
 * Fetch detailed application record by ID (Admin / TPO only).
 */
export const fetchApplicationById = async (
  id: string
): Promise<AdminApplicantData> => {
  const response = await apiClient.get(`/applications/${id}`);
  if (response.data?.success) {
    return response.data.data.application;
  }
  throw new Error(response.data?.message || 'Failed to load application');
};

/**
 * Update candidate application status (Admin / TPO only).
 */
export const updateApplicationStatus = async (
  id: string,
  status: ApplicationStatus
): Promise<AdminApplicantData> => {
  const response = await apiClient.patch(`/applications/${id}/status`, { status });
  if (response.data?.success) {
    return response.data.data.application;
  }
  throw new Error(response.data?.message || 'Failed to update application status');
};
