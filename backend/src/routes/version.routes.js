import { Router } from 'express';
import { listVersions, restoreVersion } from '../controllers/version.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/:id/versions', listVersions);
router.post('/:id/versions/:versionId/restore', restoreVersion);

export default router;
