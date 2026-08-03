import { Router } from 'express';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { donateSchema } from '../validators/support.validator';
import {
  getProjects,
  submitDonation,
} from '../controllers/supportController';

const router = Router();

router.get('/projects', asyncHandler(getProjects));
router.post('/donate', validateRequest(donateSchema), asyncHandler(submitDonation));

export default router;
