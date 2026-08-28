import { z } from 'zod';

export const createBranchSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Branch name must be at least 2 characters.'),
    code: z.string().trim().min(2, 'Branch code must be at least 2 characters.').toUpperCase(),
    description: z.string().optional(),
    location: z.string().optional(),
    archdeaconryId: z.string().trim().min(1, 'archdeaconryId is required.'),
    dioceseId: z.string().trim().optional(),
    executiveIds: z.array(z.string()).optional(),
  }),
});

export const updateBranchSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    code: z.string().trim().min(2).toUpperCase().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    archdeaconryId: z.string().trim().optional(),
    dioceseId: z.string().trim().optional(),
    executiveIds: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
});
