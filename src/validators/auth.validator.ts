import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format.'),
    password: z.string().min(1, 'Password is required.'),
    role: z.enum(['youth', 'executive']).optional(),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    email: z.string().email('Invalid email address format.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    role: z.enum(['youth', 'executive']),
    church: z.string().optional(),
    phone: z.string().optional(),
  }),
});
