import { z } from 'zod';

export const getResourcesSchema = z.object({
  query: z.object({
    category: z.string().optional(),
    type: z.string().optional(),
    featured: z.string().optional(),
  }),
});

export const getResourceByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a numeric string'),
  }),
});

export const createResourceSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    type: z.enum(['pdf', 'video', 'audio']),
    category: z.string(),
    downloadUrl: z.string().default('#'),
    image: z.string().url('Image must be a valid URL'),
    featured: z.boolean().default(false),
  }),
});
