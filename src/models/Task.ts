import { Schema, model, Document } from 'mongoose';
import { UserRole, ALL_ROLES } from '../config/permissions';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ITask {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  assignedTo?: string;
  assignedRole?: UserRole;
  branchId?: string;
  archdeaconryId?: string;
  dioceseId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITaskDocument extends Omit<ITask, 'id'>, Document {}

const taskSchema = new Schema<ITaskDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    createdBy: { type: String, required: true, index: true },
    assignedTo: { type: String, default: '', index: true },
    assignedRole: { type: String, enum: ALL_ROLES, index: true },
    branchId: { type: String, default: '', index: true },
    archdeaconryId: { type: String, default: '', index: true },
    dioceseId: { type: String, required: true, default: 'accra', index: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      required: true,
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      required: true,
      default: 'pending',
      index: true,
    },
    dueDate: { type: Date, index: true },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const TaskModel = model<ITaskDocument>('Task', taskSchema);
