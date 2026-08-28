import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorize';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getResourcesSchema,
  getResourceByIdSchema,
  createResourceSchema,
} from '../validators/resource.validator';
import {
  getResources,
  getResourceById,
  createResource,
} from '../controllers/resourceController';

const router = Router();

// Public Read Endpoints
router.get('/', validateRequest(getResourcesSchema), asyncHandler(getResources));
router.get('/:id', validateRequest(getResourceByIdSchema), asyncHandler(getResourceById));

// Protected Content Creation Endpoint
router.post(
  '/',
  authenticate,
  authorizePermissions('content:create'),
  validateRequest(createResourceSchema),
  asyncHandler(createResource)
);

export default router;
