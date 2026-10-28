import { z } from 'zod';

export const createListingSchema = z.object({
  companyName: z
    .string({ required_error: 'Company name is required' })
    .trim()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name cannot exceed 100 characters'),
  title: z
    .string({ required_error: 'Opportunity title is required' })
    .trim()
    .min(2, 'Opportunity title must be at least 2 characters')
    .max(100, 'Opportunity title cannot exceed 100 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),
  opportunityType: z.enum(['internship', 'full_time', 'internship_and_full_time'], {
    errorMap: () => ({ message: 'Invalid opportunity type' }),
  }),
  location: z
    .string({ required_error: 'Location is required' })
    .trim()
    .min(2, 'Location must be at least 2 characters')
    .max(100, 'Location cannot exceed 100 characters'),
  workArrangement: z.enum(['on_site', 'remote', 'hybrid'], {
    errorMap: () => ({ message: 'Invalid work arrangement' }),
  }),
  compensation: z
    .string({ required_error: 'Compensation is required' })
    .trim()
    .min(2, 'Compensation must be at least 2 characters')
    .max(100, 'Compensation cannot exceed 100 characters'),
  employmentType: z.enum(['full_time', 'internship', 'contract'], {
    errorMap: () => ({ message: 'Invalid employment type' }),
  }),
  skillsRequired: z
    .array(z.string().trim().min(1, 'Skill tag cannot be empty'))
    .min(1, 'At least one skill is required'),
  responsibilities: z.array(z.string().trim()).default([]),
  eligibility: z
    .object({
      minCgpa: z
        .number({ invalid_type_error: 'Minimum CGPA must be a number' })
        .min(0, 'Minimum CGPA cannot be negative')
        .max(10, 'Minimum CGPA cannot exceed 10.0')
        .default(0),
      eligibleDepartments: z.array(z.string().trim()).default([]),
      eligibleGraduationYears: z
        .array(
          z
            .number()
            .int()
            .min(2000, 'Graduation year must be >= 2000')
            .max(2040, 'Graduation year must be <= 2040')
        )
        .default([]),
      additionalCriteria: z.string().trim().max(500).default(''),
    })
    .default({ minCgpa: 0, eligibleDepartments: [], eligibleGraduationYears: [] }),
  applicationOpenDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
  applicationDeadline: z
    .string({ required_error: 'Application deadline is required' })
    .refine(
      (val) => {
        const d = new Date(val);
        return !isNaN(d.getTime()) && d > new Date();
      },
      { message: 'Application deadline must be a future date' }
    )
    .transform((val) => new Date(val)),
  status: z.enum(['draft', 'published', 'closed']).default('draft'),
});

export const updateListingSchema = z
  .object({
    companyName: z.string().trim().min(2).max(100).optional(),
    title: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    opportunityType: z
      .enum(['internship', 'full_time', 'internship_and_full_time'])
      .optional(),
    location: z.string().trim().min(2).max(100).optional(),
    workArrangement: z.enum(['on_site', 'remote', 'hybrid']).optional(),
    compensation: z.string().trim().min(2).max(100).optional(),
    employmentType: z.enum(['full_time', 'internship', 'contract']).optional(),
    skillsRequired: z.array(z.string().trim().min(1)).min(1).optional(),
    responsibilities: z.array(z.string().trim()).optional(),
    eligibility: z
      .object({
        minCgpa: z.number().min(0).max(10).optional(),
        eligibleDepartments: z.array(z.string().trim()).optional(),
        eligibleGraduationYears: z
          .array(z.number().int().min(2000).max(2040))
          .optional(),
        additionalCriteria: z.string().trim().max(500).optional(),
      })
      .optional(),
    applicationOpenDate: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
    applicationDeadline: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const d = new Date(val);
          return !isNaN(d.getTime()) && d > new Date();
        },
        { message: 'Application deadline must be a future date' }
      )
      .transform((val) => (val ? new Date(val) : undefined)),
    status: z.enum(['draft', 'published', 'closed']).optional(),
  })
  .strict();

export const updateListingStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'closed'], {
    errorMap: () => ({ message: 'Status must be draft, published, or closed' }),
  }),
});

export const queryListingsSchema = z.object({
  search: z.string().trim().optional(),
  opportunityType: z
    .enum(['internship', 'full_time', 'internship_and_full_time'])
    .optional(),
  workArrangement: z.enum(['on_site', 'remote', 'hybrid']).optional(),
  department: z.string().trim().optional(),
  graduationYear: z.coerce.number().optional(),
  status: z.enum(['draft', 'published', 'closed', 'all']).optional(),
  sortBy: z.enum(['deadline', 'createdAt', 'companyName', 'minCgpa']).default('deadline'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
