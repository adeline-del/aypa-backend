import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorize';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createBranchSchema,
  updateBranchSchema,
} from '../validators/branch.validator';
import {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchMembers,
} from '../controllers/branchController';

const router = Router();

router.get('/', asyncHandler(getBranches));
router.get('/:id', asyncHandler(getBranchById));

router.post(
  '/',
  authenticate,
  authorizePermissions('branches:create'),
  validateRequest(createBranchSchema),
  asyncHandler(createBranch)
);

router.patch(
  '/:id',
  authenticate,
  authorizePermissions('branches:update'),
  validateRequest(updateBranchSchema),
  asyncHandler(updateBranch)
);

router.delete(
  '/:id',
  authenticate,
  authorizePermissions('branches:delete'),
  asyncHandler(deleteBranch)
);

router.get(
  '/:id/members',
  authenticate,
  authorizePermissions('branches:read'),
  asyncHandler(getBranchMembers)
);

export default router;
