import { Router } from 'express';
import * as folderController from '../controllers/folder.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createFolderSchema, renameFolderSchema } from '../validators/folder.validator.js';

const router = Router();

// Protect all folder routes with authentication middleware
router.use(authenticateToken);

// Create folder
router.post('/', validate(createFolderSchema), folderController.createFolder);

// List contents of folder or root
router.get('/:id/contents', folderController.getFolderContents);

// Rename folder
router.patch('/:id', validate(renameFolderSchema), folderController.renameFolder);

// Delete folder (hard delete, rejects non-empty)
router.delete('/:id', folderController.deleteFolder);

export default router;
