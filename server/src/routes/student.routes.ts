import { Router } from 'express';
import { getStudentResumeAdmin } from '../controllers/resume.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { resumeDownloadLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Admin endpoint: GET /api/students/:studentId/resume
router.get(
  '/:studentId/resume',
  requireAuth,
  requireRole('admin'),
  resumeDownloadLimiter,
  getStudentResumeAdmin
);

export default router;
