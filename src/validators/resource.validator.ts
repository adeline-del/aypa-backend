import { z } from 'zod';

export const getResourcesSchema = z.object({
  query: z.object({
    category: z.string().optional(),
    type: z.string().optional(),
    featured: z.string().optional(),
  }),
});

export const getResourceByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a numeric string'),
  }),
});

export const createResourceSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional().default(''),
    type: z.string().transform((val) => val.toLowerCase()),
    category: z.string(),
    downloadUrl: z.string().optional().default('#'),
    fileUrl: z.string().optional(),
    image: z.string().optional().default(''),
    featured: z.boolean().optional().default(false),
    author: z.string().optional(),
    isPublic: z.boolean().optional(),
    publicId: z.string().optional(),
    originalFilename: z.string().optional(),
    mimeType: z.string().optional(),
    fileSize: z.number().optional(),
  }),
});

export const updateResourceSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a numeric string'),
  }),
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').optional(),
    description: z.string().optional(),
    type: z.string().transform((val) => val.toLowerCase()).optional(),
    category: z.string().optional(),
    downloadUrl: z.string().optional(),
    fileUrl: z.string().optional(),
    image: z.string().optional(),
    featured: z.boolean().optional(),
    author: z.string().optional(),
    isPublic: z.boolean().optional(),
  }),
});

