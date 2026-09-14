import { Schema, model, Document } from 'mongoose';

export interface INotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'report' | 'event' | 'appointment';
  link?: string;
  isRead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INotificationDocument extends Omit<INotification, 'id'>, Document {}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'success', 'report', 'event', 'appointment'],
      default: 'info',
    },
    link: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = model<INotificationDocument>('Notification', notificationSchema);
