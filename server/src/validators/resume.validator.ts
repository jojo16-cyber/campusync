import { z } from 'zod';
import mongoose from 'mongoose';

export const studentIdParamSchema = z.object({
  studentId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid student ID format',
  }),
});

export const applicationIdParamSchema = z.object({
  applicationId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid application ID format',
  }),
});

export const resumeQuerySchema = z.object({
  metadata: z.enum(['true', 'false']).optional(),
  download: z.enum(['true', 'false']).optional(),
});
