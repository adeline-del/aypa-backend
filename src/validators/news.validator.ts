import { z } from 'zod';

export const getNewsSchema = z.object({
  query: z.object({
    category: z.string().optional(),
    featured: z.string().optional(),
  }),
});

export const getNewsByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a numeric string'),
  }),
});

export const createNewsSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    excerpt: z.string().min(10, 'Excerpt must be at least 10 characters'),
    content: z.string().min(20, 'Content must be at least 20 characters'),
    author: z.string().min(2, 'Author name required'),
    date: z.string(),
    category: z.string(),
    image: z.string().url('Image must be a valid URL'),
    featured: z.boolean().default(false),
  }),
});
