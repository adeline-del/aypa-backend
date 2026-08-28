import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorize';
import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from '../validators/task.validator';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
} from '../controllers/taskController';

const router = Router();

router.use(authenticate);

router.get('/', authorizePermissions('tasks:read'), asyncHandler(getTasks));
router.get('/:id', authorizePermissions('tasks:read'), asyncHandler(getTaskById));

router.post(
  '/',
  authorizePermissions('tasks:create'),
  validateRequest(createTaskSchema),
  asyncHandler(createTask)
);

router.patch(
  '/:id',
  authorizePermissions('tasks:update'),
  validateRequest(updateTaskSchema),
  asyncHandler(updateTask)
);

router.post(
  '/:id/status',
  authorizePermissions('tasks:update'),
  validateRequest(updateTaskStatusSchema),
  asyncHandler(updateTaskStatus)
);

export default router;
