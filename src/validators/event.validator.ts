import { z } from 'zod';

export const getEventsSchema = z.object({
  query: z.object({
    category: z.string().optional(),
    isLive: z.string().optional(),
  }),
});

export const getEventByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a valid numeric string'),
  }),
});

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    date: z.string(),
    time: z.string(),
    location: z.string(),
    category: z.string(),
    capacity: z.number().positive(),
    isLive: z.boolean().default(false),
    streamUrl: z.string().optional(),
    image: z.string().url('Image must be a valid URL'),
  }),
});

export const registerEventSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a valid numeric string'),
  }),
});
