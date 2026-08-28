import { Router } from 'express';
import * as fileController from '../controllers/file.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { requestUploadUrlSchema, confirmUploadSchema, renameFileSchema } from '../validators/file.validator.js';

const router = Router();

// Dev fallback endpoints (unprotected for local testing when AWS S3 is not configured)
router.put('/mock-s3-upload', fileController.mockS3Upload);
router.get('/mock-s3-download', fileController.mockS3Download);

// Protect all remaining file endpoints with authentication middleware
router.use(authenticateToken);

// Request presigned upload URL & create pending file record
router.post('/upload-url', validate(requestUploadUrlSchema), fileController.requestUploadUrl);

// Confirm upload completion
router.post('/:id/confirm', validate(confirmUploadSchema), fileController.confirmUpload);

// Request presigned download URL
router.get('/:id/download-url', fileController.getDownloadUrl);

// Rename file
router.patch('/:id', validate(renameFileSchema), fileController.renameFile);

// Delete file (hard delete: removes S3 object + DB record)
router.delete('/:id', fileController.deleteFile);

export default router;
