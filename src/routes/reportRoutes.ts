import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorize';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createReportSchema,
  updateReportSchema,
  reviewReportSchema,
  rejectReportSchema,
} from '../validators/report.validator';
import {
  getReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  submitReport,
  reviewReport,
  approveReport,
  rejectReport,
} from '../controllers/reportController';

const router = Router();

router.use(authenticate);

router.get('/', authorizePermissions('reports:read'), asyncHandler(getReports));
router.get('/:id', authorizePermissions('reports:read'), asyncHandler(getReportById));

router.post(
  '/',
  authorizePermissions('reports:create'),
  validateRequest(createReportSchema),
  asyncHandler(createReport)
);

router.patch(
  '/:id',
  authorizePermissions('reports:update'),
  validateRequest(updateReportSchema),
  asyncHandler(updateReport)
);

router.delete(
  '/:id',
  authorizePermissions('reports:delete'),
  asyncHandler(deleteReport)
);

router.post(
  '/:id/submit',
  authorizePermissions('reports:create'),
  asyncHandler(submitReport)
);


router.post(
  '/:id/review',
  authorizePermissions('reports:review'),
  validateRequest(reviewReportSchema),
  asyncHandler(reviewReport)
);

router.post(
  '/:id/approve',
  authorizePermissions('reports:review'),
  validateRequest(reviewReportSchema),
  asyncHandler(approveReport)
);

router.post(
  '/:id/reject',
  authorizePermissions('reports:review'),
  validateRequest(rejectReportSchema),
  asyncHandler(rejectReport)
);

export default router;
