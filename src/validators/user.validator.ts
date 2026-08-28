import { z } from 'zod';
import { ALL_ROLES } from '../config/permissions';

export const approveUserSchema = z.object({
  body: z.object({
    isApproved: z.boolean({ required_error: 'isApproved boolean status is required.' }),
  }),
});

export const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(ALL_ROLES as [string, ...string[]]),
    permissions: z.array(z.string()).optional(),
    dioceseId: z.string().optional(),
    archdeaconryId: z.string().optional(),
    branchId: z.string().optional(),
  }),
});

export const updateUserStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean({ required_error: 'isActive boolean status is required.' }),
  }),
});
