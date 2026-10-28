import { z } from 'zod';

export const submitApplicationSchema = z.object({
  listingId: z
    .string({ required_error: 'Listing ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid listing ID format'),
  coverLetter: z
    .string()
    .trim()
    .max(2000, 'Cover letter cannot exceed 2000 characters')
    .optional()
    .default(''),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(
    [
      'under_review',
      'shortlisted',
      'interview_scheduled',
      'selected',
      'rejected',
    ] as const,
    {
      errorMap: () => ({ message: 'Invalid or unsupported application status for update' }),
    }
  ),
});

export const queryApplicationsSchema = z.object({
  status: z
    .enum([
      'all',
      'submitted',
      'under_review',
      'shortlisted',
      'interview_scheduled',
      'selected',
      'rejected',
      'withdrawn',
    ] as const)
    .default('all')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
