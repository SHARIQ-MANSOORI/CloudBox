import { Router } from 'express';
import {
  getTrash,
  restoreFileHandler,
  restoreFolderHandler,
  purgeItemHandler
} from '../controllers/trash.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

// GET /api/trash
router.get('/', getTrash);

// POST /api/files/:id/restore & POST /api/folders/:id/restore
router.post('/files/:id/restore', restoreFileHandler);
router.post('/folders/:id/restore', restoreFolderHandler);

// DELETE /api/trash/:type/:id
router.delete('/:type/:id', purgeItemHandler);

export default router;
