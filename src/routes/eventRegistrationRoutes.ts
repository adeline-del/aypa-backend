import { Router } from 'express';

import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validate';
import { registerForEvent } from '../controllers/eventRegistrationController';
import { eventRegistrationSchema } from '../validators/eventRegistration.validator';

const router = Router();

router.post(
  '/:eventId/register',
  validateRequest(eventRegistrationSchema),
  asyncHandler(registerForEvent),
);

export default router;