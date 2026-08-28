import { z } from 'zod';

export const createReportSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3, 'Report title must be at least 3 characters.'),
    reportingPeriod: z.string().trim().min(2, 'reportingPeriod is required.'),
    summary: z.string().trim().min(10, 'Summary must be at least 10 characters.'),
    activities: z.string().optional(),
    attendance: z.number().int().nonnegative().optional(),
    achievements: z.string().optional(),
    challenges: z.string().optional(),
    recommendations: z.string().optional(),
  }),
});

export const updateReportSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).optional(),
    reportingPeriod: z.string().trim().optional(),
    summary: z.string().trim().min(10).optional(),
    activities: z.string().optional(),
    attendance: z.number().int().nonnegative().optional(),
    achievements: z.string().optional(),
    challenges: z.string().optional(),
    recommendations: z.string().optional(),
  }),
});

export const reviewReportSchema = z.object({
  body: z.object({
    reviewComment: z.string().optional(),
  }),
});

export const rejectReportSchema = z.object({
  body: z.object({
    reviewComment: z.string().trim().min(3, 'Reason/comment is required when rejecting a report.'),
  }),
});
