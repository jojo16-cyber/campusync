import { apiClient } from './client';

export type ResumeStatus = 'not_uploaded' | 'uploaded' | 'verified';

export interface StudentProfileData {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  phone: string;
  avatarUrl: string;
  institution: string;
  department: string;
  degree: string;
  graduationYear: number | null;
  cgpa: number | null;
  rollNumber: string;
  skills: string[];
  bio: string;
  linkedInUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  resumeStatus: ResumeStatus;
  resumeUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileCompletionResult {
  percentage: number;
  completedFields: string[];
  missingFields: string[];
  isComplete: boolean;
}

export interface ProfileResponseData {
  profile: StudentProfileData;
  completion: ProfileCompletionResult;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  institution?: string;
  department?: string;
  degree?: string;
  graduationYear?: number | null;
  cgpa?: number | null;
  rollNumber?: string;
  skills?: string[];
  bio?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

/**
 * Fetch authenticated student's profile and dynamic completion status
 */
export const fetchMyProfile = async (): Promise<ProfileResponseData> => {
  const response = await apiClient.get('/profile/me');
  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to fetch student profile');
};

/**
 * Update authenticated student's profile safe fields
 */
export const updateMyProfile = async (
  payload: UpdateProfilePayload
): Promise<ProfileResponseData> => {
  const response = await apiClient.put('/profile/me', payload);
  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to update student profile');
};
