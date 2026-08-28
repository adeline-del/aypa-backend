import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorize';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getNewsSchema,
  getNewsByIdSchema,
  createNewsSchema,
} from '../validators/news.validator';
import {
  getNews,
  getNewsById,
  createNews,
} from '../controllers/newsController';

const router = Router();

// Public Read Endpoints
router.get('/', validateRequest(getNewsSchema), asyncHandler(getNews));
router.get('/:id', validateRequest(getNewsByIdSchema), asyncHandler(getNewsById));

// Protected Content Creation Endpoint
router.post(
  '/',
  authenticate,
  authorizePermissions('content:create'),
  validateRequest(createNewsSchema),
  asyncHandler(createNews)
);

export default router;
