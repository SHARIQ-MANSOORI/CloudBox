import { z } from 'zod';

export const requestUploadUrlSchema = z.object({
  name: z.string({ required_error: 'File name is required' })
    .trim()
    .min(1, 'File name cannot be empty')
    .max(255, 'File name is too long'),
  mimeType: z.string().trim().default('application/octet-stream'),
  sizeInBytes: z.number().nonnegative('Size cannot be negative').default(0),
  folderId: z.string().uuid('Invalid folder ID').nullable().optional()
});

export const confirmUploadSchema = z.object({
  sizeInBytes: z.number().nonnegative('Size cannot be negative').optional(),
  wrappedKey: z.string().nullable().optional(),
  iv: z.string().nullable().optional()
});

export const renameFileSchema = z.object({
  name: z.string({ required_error: 'New file name is required' })
    .trim()
    .min(1, 'File name cannot be empty')
    .max(255, 'File name is too long')
});
