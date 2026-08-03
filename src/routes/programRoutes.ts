import { Router } from 'express';
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

router.get('/', validateRequest(getProgramsSchema), asyncHandler(getPrograms));
router.get('/:id', validateRequest(getProgramByIdSchema), asyncHandler(getProgramById));
router.post('/', validateRequest(createProgramSchema), asyncHandler(createProgram));

export default router;
