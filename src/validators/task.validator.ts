import { z } from 'zod';
import { ALL_ROLES } from '../config/permissions';

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3, 'Task title must be at least 3 characters.'),
    description: z.string().trim().min(5, 'Task description must be at least 5 characters.'),
    assignedTo: z.string().optional(),
    assignedRole: z.enum(ALL_ROLES as [string, ...string[]]).optional(),
    branchId: z.string().optional(),
    archdeaconryId: z.string().optional(),
    dioceseId: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    dueDate: z.string().optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).optional(),
    description: z.string().trim().min(5).optional(),
    assignedTo: z.string().optional(),
    assignedRole: z.enum(ALL_ROLES as [string, ...string[]]).optional(),
    branchId: z.string().optional(),
    archdeaconryId: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    dueDate: z.string().optional(),
  }),
});

export const updateTaskStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  }),
});
