import { z } from 'zod';

export const createBranchSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Branch name must be at least 2 characters.'),
    code: z.string().trim().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    address: z.string().optional(),
    archdeaconryId: z.string().trim().min(1, 'archdeaconryId is required.'),
    archdeaconryName: z.string().optional(),
    dioceseId: z.string().trim().optional(),
    executiveIds: z.array(z.string()).optional(),
    contactEmail: z.string().email('Invalid email address format.').optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    presidentName: z.string().optional(),
    secretaryName: z.string().optional(),
    chaplainName: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

export const updateBranchSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    code: z.string().trim().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    address: z.string().optional(),
    archdeaconryId: z.string().trim().optional(),
    archdeaconryName: z.string().optional(),
    dioceseId: z.string().trim().optional(),
    executiveIds: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    contactEmail: z.string().optional(),
    contactPhone: z.string().optional(),
    presidentName: z.string().optional(),
    secretaryName: z.string().optional(),
    chaplainName: z.string().optional(),
  }),
});

