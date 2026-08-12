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
    id: z.string().regex(/^\d+$/, 'ID must be a number'),
  }),

  body: z.object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name is too long'),

    email: z
      .string()
      .trim()
      .email('Please provide a valid email address'),

    phone: z
      .string()
      .trim()
      .min(7, 'Please provide a valid phone number')
      .max(20, 'Phone number is too long'),

    archdeaconry: z
      .string()
      .trim()
      .max(150)
      .optional(),

    parish: z
      .string()
      .trim()
      .max(150)
      .optional(),

    age: z
      .number()
      .int()
      .min(1)
      .max(120)
      .optional(),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a valid numeric string'),
  }),
  body: z
    .object({
      title: z.string().min(3, 'Title must be at least 3 characters').optional(),
      description: z
        .string()
        .min(10, 'Description must be at least 10 characters')
        .optional(),
      date: z.string().optional(),
      time: z.string().optional(),
      location: z.string().optional(),
      category: z.string().optional(),
      capacity: z.number().positive().optional(),
      isLive: z.boolean().optional(),
      streamUrl: z.string().optional(),
      image: z.string().url('Image must be a valid URL').optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});