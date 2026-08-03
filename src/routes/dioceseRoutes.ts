import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getArchdeaconries } from '../controllers/dioceseController';

const router = Router();

router.get('/', asyncHandler(getArchdeaconries));

export default router;
