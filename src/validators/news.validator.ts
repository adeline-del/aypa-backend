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

const baseNewsPayloadSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  excerpt: z.string().optional().default(''),
  summary: z.string().optional(),
  content: z.string().optional().default(''),
  author: z.string().optional().default(''),
  date: z.string().optional(),
  category: z.string().optional().default('News'),
  image: z.string().optional().default(''),
  featured: z.boolean().optional().default(false),
  state: z
    .enum(['draft', 'needs_review', 'scheduled', 'published'])
    .optional()
    .default('published'),
});

const refinePublicationState = (data: Record<string, any>, ctx: z.RefinementCtx) => {
  const targetState = data.state || 'published';
  if (targetState === 'needs_review' || targetState === 'published') {
    if (data.category !== undefined && (!data.category || data.category.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Category is required before submitting for review or publishing.',
        path: ['category'],
      });
    }
    if (data.author !== undefined && (!data.author || data.author.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Author is required before submitting for review or publishing.',
        path: ['author'],
      });
    }
    const effExcerpt = (data.excerpt || data.summary || '').trim();
    if (data.excerpt !== undefined || data.summary !== undefined) {
      if (effExcerpt.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Summary / Excerpt must be at least 10 characters before submitting for review or publishing.',
          path: ['excerpt'],
        });
      }
    }
    if (data.content !== undefined && (!data.content || data.content.trim().length < 20)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Article body content must be at least 20 characters before submitting for review or publishing.',
        path: ['content'],
      });
    }
  }
};

export const createNewsSchema = z.object({
  body: baseNewsPayloadSchema.superRefine(refinePublicationState),
});

export const updateNewsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a numeric string'),
  }),
  body: baseNewsPayloadSchema.partial().superRefine(refinePublicationState),
});



