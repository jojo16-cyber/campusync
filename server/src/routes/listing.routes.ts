import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import {
  createListing,
  getListings,
  getListingById,
  updateListing,
  updateListingStatus,
  deleteListing,
} from '../controllers/listing.controller';

const router = Router();

// Browsing and detail (Student & Admin)
router.get('/', requireAuth, getListings);
router.get('/:id', requireAuth, getListingById);

// Admin-only management endpoints
router.post('/', requireAuth, requireRole('admin'), createListing);
router.put('/:id', requireAuth, requireRole('admin'), updateListing);
router.patch('/:id/status', requireAuth, requireRole('admin'), updateListingStatus);
router.delete('/:id', requireAuth, requireRole('admin'), deleteListing);

export default router;
