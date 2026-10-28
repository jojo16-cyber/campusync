import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import profileRoutes from './profile.routes';
import listingRoutes from './listing.routes';
import applicationRoutes from './application.routes';
import resumeRoutes from './resume.routes';
import studentRoutes from './student.routes';
import notificationRoutes from './notification.routes';

const router = Router();

// Mount route modules
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/listings', listingRoutes);
router.use('/applications', applicationRoutes);
router.use('/resumes', resumeRoutes);
router.use('/students', studentRoutes);
router.use('/notifications', notificationRoutes);

export default router;

