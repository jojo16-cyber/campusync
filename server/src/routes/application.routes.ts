import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { resumeDownloadLimiter } from '../middlewares/rateLimiter';
import {
  submitApplication,
  getMyApplications,
  getMyApplicationById,
  withdrawApplication,
  getApplicationById,
  updateApplicationStatus,
} from '../controllers/application.controller';
import { getApplicationResumeAdmin } from '../controllers/resume.controller';

const router = Router();

// Student-specific endpoints (placed before generic /:id to prevent route shadowing)
router.post('/', requireAuth, requireRole('student'), submitApplication);
router.get('/me', requireAuth, requireRole('student'), getMyApplications);
router.get('/me/:id', requireAuth, requireRole('student'), getMyApplicationById);
router.patch('/:id/withdraw', requireAuth, requireRole('student'), withdrawApplication);

// Admin-specific endpoints
router.get('/:id', requireAuth, requireRole('admin'), getApplicationById);
router.get('/:id/resume', requireAuth, requireRole('admin'), resumeDownloadLimiter, getApplicationResumeAdmin);
router.patch('/:id/status', requireAuth, requireRole('admin'), updateApplicationStatus);

export default router;
