import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorize';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getResourcesSchema,
  getResourceByIdSchema,
  createResourceSchema,
  updateResourceSchema,
} from '../validators/resource.validator';
import {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  downloadResource,
  viewResource,
} from '../controllers/resourceController';

const router = Router();

// Public Read Endpoints
router.get('/', validateRequest(getResourcesSchema), asyncHandler(getResources));
router.get('/:id/view', validateRequest(getResourceByIdSchema), asyncHandler(viewResource));
router.get('/:id/download', validateRequest(getResourceByIdSchema), asyncHandler(downloadResource));
router.get('/:id', validateRequest(getResourceByIdSchema), asyncHandler(getResourceById));

// Protected Content Management Endpoints
router.post(
  '/',
  authenticate,
  authorizePermissions('content:create'),
  validateRequest(createResourceSchema),
  asyncHandler(createResource)
);

router.patch(
  '/:id',
  authenticate,
  authorizePermissions('content:update'),
  validateRequest(updateResourceSchema),
  asyncHandler(updateResource)
);

router.delete(
  '/:id',
  authenticate,
  authorizePermissions('content:delete'),
  asyncHandler(deleteResource)
);

export default router;

