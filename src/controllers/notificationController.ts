import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { NotificationModel } from '../models/Notification';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';

// In-memory mock store fallback for notifications when USE_IN_MEMORY_MOCK is true
export const inMemoryNotifications: Array<{
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'report' | 'event' | 'appointment';
  link?: string;
  isRead: boolean;
  createdAt: Date;
}> = [];

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const userId = req.user.id;

  if (config.useInMemoryMock) {
    const userNotes = inMemoryNotifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const unreadCount = userNotes.filter((n) => !n.isRead).length;

    res.status(200).json({
      success: true,
      unreadCount,
      count: userNotes.length,
      data: userNotes,
    });
    return;
  }

  const notifications = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await NotificationModel.countDocuments({ userId, isRead: false });

  res.status(200).json({
    success: true,
    unreadCount,
    count: notifications.length,
    data: notifications.map((n) => n.toJSON()),
  });
};

export const markNotificationRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;
  const userId = req.user.id;

  if (config.useInMemoryMock) {
    const note = inMemoryNotifications.find((n) => n.id === id);
    if (!note) {
      throw new ApiError(404, 'Notification not found.');
    }

    if (note.userId !== userId) {
      throw new ApiError(403, 'Access denied. You cannot modify another user\'s notification.');
    }

    note.isRead = true;

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: note,
    });
    return;
  }

  const notification = await NotificationModel.findById(id);

  if (!notification) {
    throw new ApiError(404, 'Notification not found.');
  }

  if (notification.userId.toString() !== userId) {
    throw new ApiError(403, 'Access denied. You cannot modify another user\'s notification.');
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    message: 'Notification marked as read.',
    data: notification.toJSON(),
  });
};

export const markAllNotificationsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const userId = req.user.id;

  if (config.useInMemoryMock) {
    inMemoryNotifications.forEach((n) => {
      if (n.userId === userId) {
        n.isRead = true;
      }
    });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
    return;
  }

  await NotificationModel.updateMany({ userId, isRead: false }, { $set: { isRead: true } });

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read.',
  });
};

// Helper method to create notification internally from controllers
export const createNotificationHelper = async (data: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'report' | 'event' | 'appointment';
  link?: string;
}): Promise<void> => {
  try {
    if (config.useInMemoryMock) {
      inMemoryNotifications.unshift({
        id: Date.now().toString(),
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        link: data.link || '',
        isRead: false,
        createdAt: new Date(),
      });
      return;
    }

    await NotificationModel.create({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      link: data.link || '',
      isRead: false,
    });
  } catch (err) {
    console.error('[Notification Trigger Error]:', err);
  }
};
