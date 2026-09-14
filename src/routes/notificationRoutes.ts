import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.put('/read-all', markAllNotificationsRead);
router.put('/:id/read', markNotificationRead);

export default router;
