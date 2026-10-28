import { apiClient } from './client';

export interface ResumeData {
  id: string;
  student: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  version: number;
  isCurrent: boolean;
  uploadedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResumeApiResponse {
  success: boolean;
  message?: string;
  data: {
    resume: ResumeData;
  };
}

/**
 * Retrieve metadata for the authenticated student's active resume.
 * Returns null if no resume has been uploaded yet.
 */
export const fetchMyResume = async (): Promise<ResumeData | null> => {
  try {
    const res = await apiClient.get<ResumeApiResponse>('/resumes/me');
    return res.data.data.resume;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      return null;
    }
    throw err;
  }
};

/**
 * Upload or replace the authenticated student's current resume using multipart/form-data.
 */
export const uploadResume = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<ResumeData> => {
  const formData = new FormData();
  formData.append('resume', file);

  const res = await apiClient.post<ResumeApiResponse>('/resumes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return res.data.data.resume;
};

/**
 * Securely download the authenticated student's resume as a binary Blob.
 */
export const downloadMyResume = async (): Promise<{ blob: Blob; filename: string }> => {
  const res = await apiClient.get('/resumes/me/download', {
    responseType: 'blob',
  });

  let filename = 'my_resume.pdf';
  const disposition = res.headers['content-disposition'];
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }
  }

  return { blob: res.data as Blob, filename };
};

/**
 * Permanently delete the authenticated student's active resume.
 */
export const deleteMyResume = async (): Promise<void> => {
  await apiClient.delete('/resumes/me');
};

/**
 * Authorized administrator download for an applicant's resume.
 */
export const downloadApplicantResume = async (
  applicationId: string
): Promise<{ blob: Blob; filename: string }> => {
  const res = await apiClient.get(`/applications/${applicationId}/resume`, {
    responseType: 'blob',
  });

  let filename = 'applicant_resume.pdf';
  const disposition = res.headers['content-disposition'];
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }
  }

  return { blob: res.data as Blob, filename };
};
