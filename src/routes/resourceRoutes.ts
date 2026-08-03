import { Router } from 'express';
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

router.get('/', validateRequest(getResourcesSchema), asyncHandler(getResources));
router.get('/:id', validateRequest(getResourceByIdSchema), asyncHandler(getResourceById));
router.post('/', validateRequest(createResourceSchema), asyncHandler(createResource));

export default router;
