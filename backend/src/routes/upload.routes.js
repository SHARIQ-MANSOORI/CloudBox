import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { initUploadSchema, getPartUrlSchema, completePartSchema } from '../validators/upload.validator.js';

const router = Router();

// Protect all upload routes with authentication middleware
router.use(authenticateToken);

// Initialize multipart upload session
router.post('/init', validate(initUploadSchema), uploadController.initUpload);

// Request presigned URL for specific part
router.post('/:sessionId/part-url', validate(getPartUrlSchema), uploadController.getPartUrl);

// Record completed part with ETag
router.post('/:sessionId/complete-part', validate(completePartSchema), uploadController.completePart);

// Finalize multipart upload session
router.post('/:sessionId/complete', uploadController.completeUpload);

// Fetch session status and list of completed parts
router.get('/:sessionId/status', uploadController.getSessionStatus);

// Abort multipart upload session
router.post('/:sessionId/abort', uploadController.abortUpload);

export default router;
