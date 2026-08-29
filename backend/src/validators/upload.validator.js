import { z } from 'zod';

export const initUploadSchema = z.object({
  filename: z.string({ required_error: 'Filename is required' })
    .trim()
    .min(1, 'Filename cannot be empty')
    .max(255, 'Filename is too long'),
  mimeType: z.string().trim().default('application/octet-stream'),
  totalSize: z.number({ required_error: 'Total file size is required' })
    .nonnegative('Total size cannot be negative'),
  folderId: z.string().uuid('Invalid folder ID').nullable().optional(),
  wrappedKey: z.string().nullable().optional(),
  iv: z.string().nullable().optional()
});

export const getPartUrlSchema = z.object({
  partNumber: z.number({ required_error: 'Part number is required' })
    .int('Part number must be an integer')
    .min(1, 'Part number must be at least 1')
});

export const completePartSchema = z.object({
  partNumber: z.number({ required_error: 'Part number is required' })
    .int('Part number must be an integer')
    .min(1, 'Part number must be at least 1'),
  eTag: z.string({ required_error: 'ETag header is required' })
    .trim()
    .min(1, 'ETag cannot be empty')
});
