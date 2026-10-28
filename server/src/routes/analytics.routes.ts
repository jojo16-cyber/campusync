import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import {
  getDashboardAnalytics,
  getKPIMetrics,
  getStatusDistribution,
  getCompanyApplications,
  getRecentApplicationsList,
} from '../controllers/analytics.controller';

const router = Router();

// All analytics endpoints require valid JWT authentication and administrator role
router.use(requireAuth, requireRole('admin'));

router.get('/dashboard', getDashboardAnalytics);
router.get('/kpis', getKPIMetrics);
router.get('/status-distribution', getStatusDistribution);
router.get('/company-applications', getCompanyApplications);
router.get('/recent-applications', getRecentApplicationsList);

export default router;
