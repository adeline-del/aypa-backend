import { z } from 'zod';
import { ALL_ROLES } from '../config/permissions';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address format.'),
    password: z.string().min(1, 'Password is required.'),
    role: z.enum(ALL_ROLES as [string, ...string[]]).optional(),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
    email: z.string().trim().toLowerCase().email('Invalid email address format.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    role: z.enum(ALL_ROLES as [string, ...string[]]),
    church: z.string().optional(),
    phone: z.string().optional(),
    dioceseId: z.string().optional(),
    archdeaconryId: z.string().optional(),
    branchId: z.string().optional(),
    profileImage: z.string().optional(),
  }),
});
