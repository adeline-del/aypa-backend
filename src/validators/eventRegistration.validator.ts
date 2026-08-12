import { z } from 'zod';

export const eventRegistrationSchema = z.object({
  params: z.object({
    eventId: z
      .string()
      .regex(/^\d+$/, 'Event ID must be a number'),
  }),

  body: z.object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must not exceed 100 characters'),

    email: z
      .string()
      .trim()
      .email('Please provide a valid email address'),

    phone: z
      .string()
      .trim()
      .min(7, 'Phone number is too short')
      .max(20, 'Phone number is too long'),

    archdeaconry: z
      .string()
      .trim()
      .min(1, 'Archdeaconry is required'),

    parish: z
      .string()
      .trim()
      .min(1, 'Parish is required'),

    age: z
      .number()
      .int('Age must be a whole number')
      .min(1, 'Age must be at least 1')
      .max(120, 'Age must not exceed 120')
      .optional(),
  }),
});