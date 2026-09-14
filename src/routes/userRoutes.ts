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
  endExecutiveAppointment,
  renewExecutiveAppointment,
  getUserAppointments,
  assignExecutiveAppointment,
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
router.post(
  '/:id/appointments',
  authorizePermissions('users:assign-role'),
  asyncHandler(assignExecutiveAppointment)
);
router.post(
  '/:id/end-appointment',
  authorizePermissions('users:assign-role'),
  asyncHandler(endExecutiveAppointment)
);
router.post(
  '/:id/renew-appointment',
  authorizePermissions('users:assign-role'),
  asyncHandler(renewExecutiveAppointment)
);
router.get(
  '/:id/appointments',
  authorizePermissions('users:read'),
  asyncHandler(getUserAppointments)
);

export default router;
