import { Router } from 'express';
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

router.get('/', validateRequest(getNewsSchema), asyncHandler(getNews));
router.get('/:id', validateRequest(getNewsByIdSchema), asyncHandler(getNewsById));
router.post('/', validateRequest(createNewsSchema), asyncHandler(createNews));

export default router;
