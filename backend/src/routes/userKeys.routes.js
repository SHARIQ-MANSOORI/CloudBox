import { Router } from 'express';
import * as userKeysController from '../controllers/userKeys.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Save/initialize keys (Protected)
router.post('/user-keys', authenticateToken, userKeysController.saveUserKeys);

// Fetch current user's key bundle (Protected)
router.get('/user-keys/me', authenticateToken, userKeysController.getMyKeys);

// Fetch public key of user by email (Protected - safe to share public keys)
router.get('/users/public-key', authenticateToken, userKeysController.getPublicKeyByEmail);

// Fetch public keys of all folder collaborators (Protected)
router.get('/folders/:id/collaborator-public-keys', authenticateToken, userKeysController.getCollaboratorPublicKeysForFolder);

// Account recovery payload lookup (Unauthenticated/Public)
router.post('/user-keys/recovery-data', userKeysController.getRecoveryData);

// Update encrypted private key using recovery key (Unauthenticated/Public during recovery flow)
router.post('/user-keys/recover-update', userKeysController.updateKeysFromRecovery);

export default router;
