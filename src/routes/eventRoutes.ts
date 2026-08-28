import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorize';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getEventsSchema,
  getEventByIdSchema,
  createEventSchema,
  registerEventSchema,
  updateEventSchema,
} from '../validators/event.validator';
import {
  getEvents,
  getEventById,
  createEvent,
  registerForEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController';

const router = Router();

// Public Read Endpoints
router.get('/', validateRequest(getEventsSchema), asyncHandler(getEvents));
router.get('/:id', validateRequest(getEventByIdSchema), asyncHandler(getEventById));

// Protected Management Endpoints
router.post(
  '/',
  authenticate,
  authorizePermissions('events:create'),
  validateRequest(createEventSchema),
  asyncHandler(createEvent)
);

router.post(
  '/:id/register',
  validateRequest(registerEventSchema),
  asyncHandler(registerForEvent)
);

router.patch(
  '/:id',
  authenticate,
  authorizePermissions('events:update'),
  validateRequest(updateEventSchema),
  asyncHandler(updateEvent)
);

router.delete(
  '/:id',
  authenticate,
  authorizePermissions('events:delete'),
  validateRequest(getEventByIdSchema),
  asyncHandler(deleteEvent)
);

export default router;
