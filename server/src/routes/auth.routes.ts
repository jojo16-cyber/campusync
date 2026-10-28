import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rateLimiter';
import { successResponse } from '../utils/apiResponse';

const router = Router();

// Public auth routes with rate limiting
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Authenticated user profile
router.get('/me', requireAuth, getMe);

// Admin-only protected route (verifies role-based authorization)
router.get('/admin-only', requireAuth, requireRole('admin'), (req, res) => {
  res.status(200).json(
    successResponse('Welcome to the admin-restricted area', {
      adminUser: req.user?.toSafeObject(),
    })
  );
});

export default router;

