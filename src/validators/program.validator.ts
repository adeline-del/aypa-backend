import { z } from 'zod';

export const getProgramsSchema = z.object({
  query: z.object({
    category: z.string().optional(),
    featured: z.string().optional(),
  }),
});

export const getProgramByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a numeric string'),
  }),
});

export const createProgramSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    schedule: z.string(),
    location: z.string(),
    ageGroup: z.string(),
    category: z.string(),
    features: z.array(z.string()).min(1, 'At least one feature is required'),
    image: z.string().url('Image must be a valid URL'),
    featured: z.boolean().default(false),
  }),
});
