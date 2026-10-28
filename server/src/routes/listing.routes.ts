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
import { getListingApplications } from '../controllers/application.controller';

const router = Router();

// Admin-only listing applicants endpoint
router.get('/:listingId/applications', requireAuth, requireRole('admin'), getListingApplications);

// Browsing and detail (Student & Admin)
router.get('/', requireAuth, getListings);
router.get('/:id', requireAuth, getListingById);

// Admin-only management endpoints
router.post('/', requireAuth, requireRole('admin'), createListing);
router.put('/:id', requireAuth, requireRole('admin'), updateListing);
router.patch('/:id/status', requireAuth, requireRole('admin'), updateListingStatus);
router.delete('/:id', requireAuth, requireRole('admin'), deleteListing);

export default router;
