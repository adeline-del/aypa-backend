import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';
import { revokeAllSessions } from '../controllers/securityController';

const router = Router();

router.use(authenticate);

router.post(
  '/revoke-sessions',
  authorizePermissions('system:manage'),
  asyncHandler(revokeAllSessions)
);

export default router;
