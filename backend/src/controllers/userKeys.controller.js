import * as userKeysService from '../services/userKeys.service.js';

export const saveUserKeys = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { publicKey, encryptedPrivateKey, encryptedPrivateKeyRecovery, pbkdf2Salt } = req.body;
    const result = await userKeysService.saveUserKeys({
      userId,
      publicKey,
      encryptedPrivateKey,
      encryptedPrivateKeyRecovery,
      pbkdf2Salt
    });

    return res.status(201).json({
      success: true,
      message: 'Cryptographic keys stored successfully.',
      keys: {
        userId: result.userId,
        publicKey: result.publicKey,
        pbkdf2Salt: result.pbkdf2Salt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyKeys = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const keys = await userKeysService.getUserKeys(userId);
    return res.status(200).json({
      success: true,
      keys
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicKeyByEmail = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email query parameter is required.' });
    }

    const data = await userKeysService.getPublicKeyByEmail(email);
    return res.status(200).json({
      success: true,
      ...data
    });
  } catch (error) {
    next(error);
  }
};

export const getCollaboratorPublicKeysForFolder = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id: folderId } = req.params;
    const recipients = await userKeysService.getCollaboratorPublicKeysForFolder({ folderId, userId });
    return res.status(200).json({
      success: true,
      recipients
    });
  } catch (error) {
    next(error);
  }
};

export const getRecoveryData = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    const data = await userKeysService.getRecoveryKeyData(email);
    return res.status(200).json({
      success: true,
      ...data
    });
  } catch (error) {
    next(error);
  }
};

export const updateKeysFromRecovery = async (req, res, next) => {
  try {
    const { userId, newEncryptedPrivateKey, newPbkdf2Salt } = req.body;
    const result = await userKeysService.updateKeysFromRecovery({ userId, newEncryptedPrivateKey, newPbkdf2Salt });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};
