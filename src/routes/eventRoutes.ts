import { Router } from 'express';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getEventsSchema,
  getEventByIdSchema,
  createEventSchema,
  registerEventSchema,
} from '../validators/event.validator';
import {
  getEvents,
  getEventById,
  createEvent,
  registerForEvent,
} from '../controllers/eventController';

const router = Router();

router.get('/', validateRequest(getEventsSchema), asyncHandler(getEvents));
router.get('/:id', validateRequest(getEventByIdSchema), asyncHandler(getEventById));
router.post('/', validateRequest(createEventSchema), asyncHandler(createEvent));
router.post('/:id/register', validateRequest(registerEventSchema), asyncHandler(registerForEvent));

export default router;
