import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorize';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getProgramsSchema,
  getProgramByIdSchema,
  createProgramSchema,
} from '../validators/program.validator';
import {
  getPrograms,
  getProgramById,
  createProgram,
} from '../controllers/programController';

const router = Router();

// Public Read Endpoints
router.get('/', validateRequest(getProgramsSchema), asyncHandler(getPrograms));
router.get('/:id', validateRequest(getProgramByIdSchema), asyncHandler(getProgramById));

// Protected Content Creation Endpoint
router.post(
  '/',
  authenticate,
  authorizePermissions('content:create'),
  validateRequest(createProgramSchema),
  asyncHandler(createProgram)
);

export default router;
