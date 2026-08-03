import { z } from 'zod';

export const donateSchema = z.object({
  body: z.object({
    projectId: z.number().int().positive('Project ID must be a positive integer'),
    amount: z.number().positive('Donation amount must be greater than 0'),
    donorName: z.string().min(2, 'Name must be at least 2 characters'),
    donorEmail: z.string().email('Invalid email address format'),
  }),
});
