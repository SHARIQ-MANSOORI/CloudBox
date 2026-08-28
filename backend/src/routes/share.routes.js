import { Router } from 'express';
import {
  shareFileHandler,
  shareFolderHandler,
  getFileSharesHandler,
  getFolderSharesHandler,
  updateShareRoleHandler,
  revokeShareHandler,
  getSharedWithMeHandler
} from '../controllers/share.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

// GET /api/shared-with-me
router.get('/shared-with-me', getSharedWithMeHandler);

// File share management
router.post('/files/:id/share', shareFileHandler);
router.get('/files/:id/shares', getFileSharesHandler);
router.patch('/files/:id/shares/:shareId', updateShareRoleHandler);
router.delete('/files/:id/shares/:shareId', revokeShareHandler);

// Folder share management
router.post('/folders/:id/share', shareFolderHandler);
router.get('/folders/:id/shares', getFolderSharesHandler);
router.patch('/folders/:id/shares/:shareId', updateShareRoleHandler);
router.delete('/folders/:id/shares/:shareId', revokeShareHandler);

export default router;
