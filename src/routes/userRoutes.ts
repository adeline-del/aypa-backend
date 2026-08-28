import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorize';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  approveUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '../validators/user.validator';
import {
  getUsers,
  approveUser,
  updateUserRole,
  updateUserStatus,
} from '../controllers/userController';

const router = Router();

// Require authentication for all user management endpoints
router.use(authenticate);

router.get('/', authorizePermissions('users:read'), asyncHandler(getUsers));
router.patch(
  '/:id/approve',
  authorizePermissions('users:approve'),
  validateRequest(approveUserSchema),
  asyncHandler(approveUser)
);
router.patch(
  '/:id/role',
  authorizePermissions('users:assign-role'),
  validateRequest(updateUserRoleSchema),
  asyncHandler(updateUserRole)
);
router.patch(
  '/:id/status',
  authorizePermissions('users:suspend'),
  validateRequest(updateUserStatusSchema),
  asyncHandler(updateUserStatus)
);

export default router;
