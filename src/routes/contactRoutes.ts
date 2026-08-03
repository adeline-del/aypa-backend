import { Router } from 'express';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { createContactSchema } from '../validators/contact.validator';
import {
  submitContactForm,
  getContactMessages,
} from '../controllers/contactController';

const router = Router();

router.post('/', validateRequest(createContactSchema), asyncHandler(submitContactForm));
router.get('/', asyncHandler(getContactMessages));

export default router;
