import { Router } from 'express';
import {
  uploadMyResume,
  getMyResume,
  downloadMyResume,
  deleteMyResume,
  getStudentResumeAdmin,
} from '../controllers/resume.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { resumeUploadLimiter, resumeDownloadLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Student resume routes (/api/resumes)
router.post('/', requireAuth, requireRole('student'), resumeUploadLimiter, uploadMyResume);
router.get('/me', requireAuth, requireRole('student'), getMyResume);
router.get('/me/download', requireAuth, requireRole('student'), resumeDownloadLimiter, downloadMyResume);
router.delete('/me', requireAuth, requireRole('student'), deleteMyResume);

// Admin retrieval of a specific student's resume
router.get(
  '/students/:studentId',
  requireAuth,
  requireRole('admin'),
  resumeDownloadLimiter,
  getStudentResumeAdmin
);

export default router;
