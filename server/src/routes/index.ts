import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Mount route modules
router.use('/health', healthRoutes);

export default router;
