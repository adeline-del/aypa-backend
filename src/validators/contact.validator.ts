import { z } from 'zod';

export const createContactSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Invalid email address format'),
    subject: z.string().min(1, 'Please select or provide a subject'),
    message: z.string().min(10, 'Message must be at least 10 characters long'),
  }),
});
