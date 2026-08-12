import { Router } from 'express';

import { asyncHandler } from '../utils/asyncHandler';
import {
  getArchdeaconries,
} from '../controllers/archdeaconryController';

const router = Router();

router.get(
  '/',
  asyncHandler(getArchdeaconries),
);

export default router;