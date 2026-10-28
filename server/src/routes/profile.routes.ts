import { Router } from 'express';
import { getMyProfile, updateMyProfile } from '../controllers/profile.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Retrieve authenticated student's profile
router.get('/me', requireAuth, getMyProfile);

// Update authenticated student's profile
router.put('/me', requireAuth, updateMyProfile);

export default router;

