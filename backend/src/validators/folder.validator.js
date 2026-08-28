import { z } from 'zod';

export const createFolderSchema = z.object({
  name: z.string({ required_error: 'Folder name is required' })
    .trim()
    .min(1, 'Folder name cannot be empty')
    .max(255, 'Folder name is too long'),
  parentFolderId: z.string().uuid('Invalid parent folder ID').nullable().optional()
});

export const renameFolderSchema = z.object({
  name: z.string({ required_error: 'New folder name is required' })
    .trim()
    .min(1, 'Folder name cannot be empty')
    .max(255, 'Folder name is too long')
});
