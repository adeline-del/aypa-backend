import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorize';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getNewsSchema,
  getNewsByIdSchema,
  createNewsSchema,
  updateNewsSchema,
} from '../validators/news.validator';
import {
  getNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
} from '../controllers/newsController';

const router = Router();

// Public Read Endpoints
router.get('/', validateRequest(getNewsSchema), asyncHandler(getNews));
router.get('/:id', validateRequest(getNewsByIdSchema), asyncHandler(getNewsById));

// Protected Content Management Endpoints
router.post(
  '/',
  authenticate,
  authorizePermissions('content:create'),
  validateRequest(createNewsSchema),
  asyncHandler(createNews)
);

router.put(
  '/:id',
  authenticate,
  authorizePermissions('content:update'),
  validateRequest(updateNewsSchema),
  asyncHandler(updateNews)
);

router.patch(
  '/:id',
  authenticate,
  authorizePermissions('content:update'),
  validateRequest(updateNewsSchema),
  asyncHandler(updateNews)
);

router.delete(
  '/:id',
  authenticate,
  authorizePermissions('content:delete'),
  validateRequest(getNewsByIdSchema),
  asyncHandler(deleteNews)
);

export default router;

