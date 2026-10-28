import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val || val === '') return true;
      try {
        const url = new URL(val);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid HTTP or HTTPS URL' }
  )
  .optional()
  .default('');

const optionalPhone = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val || val === '') return true;
      // Allow international and domestic formats: 7 to 15 digits with optional leading + and separators
      return /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/.test(val);
    },
    { message: 'Please enter a valid phone number format' }
  )
  .optional()
  .default('');

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name cannot exceed 100 characters')
      .optional(),
    phone: optionalPhone,
    avatarUrl: optionalUrl,
    institution: z.string().trim().max(150, 'Institution name is too long').optional().default(''),
    department: z.string().trim().max(100, 'Department name is too long').optional().default(''),
    degree: z.string().trim().max(50, 'Degree name is too long').optional().default(''),
    graduationYear: z
      .number({ invalid_type_error: 'Graduation year must be a valid number' })
      .int('Graduation year must be an integer')
      .min(2000, 'Graduation year must be 2000 or later')
      .max(2040, 'Graduation year cannot be beyond 2040')
      .nullable()
      .optional(),
    cgpa: z
      .number({ invalid_type_error: 'CGPA must be a valid number' })
      .min(0.0, 'CGPA cannot be negative')
      .max(10.0, 'CGPA cannot exceed 10.0')
      .nullable()
      .optional(),
    rollNumber: z.string().trim().max(50, 'Roll number is too long').optional().default(''),
    skills: z
      .array(
        z.string().trim().min(1, 'Skill tag cannot be empty').max(50, 'Skill tag is too long')
      )
      .max(50, 'Cannot exceed 50 skill tags')
      .optional()
      .default([]),
    bio: z.string().trim().max(1000, 'Bio cannot exceed 1000 characters').optional().default(''),
    linkedInUrl: optionalUrl,
    githubUrl: optionalUrl,
    portfolioUrl: optionalUrl,

    // Sensitive field detection for mass assignment prevention
    role: z.unknown().optional(),
    email: z.unknown().optional(),
    userId: z.unknown().optional(),
    password: z.unknown().optional(),
    _id: z.unknown().optional(),
  })
  .refine(
    (data) => {
      // Disallow attempt to change role or sensitive fields
      return (
        data.role === undefined &&
        data.email === undefined &&
        data.userId === undefined &&
        data.password === undefined &&
        data._id === undefined
      );
    },
    {
      message: 'Modification of sensitive fields (role, email, password, userId) is strictly forbidden',
      path: ['role'],
    }
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
