import {
  shareFile,
  shareFolder,
  getItemShares,
  updateShareRole,
  revokeShare,
  getSharedWithMe
} from '../services/share.service.js';

export const shareFileHandler = async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const ownerId = req.user.id;
    const { email, role, wrappedKeyForUser } = req.body;

    const result = await shareFile({ fileId, ownerId, targetEmail: email, role, wrappedKeyForUser });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const shareFolderHandler = async (req, res, next) => {
  try {
    const folderId = req.params.id;
    const ownerId = req.user.id;
    const { email, role, wrappedKeyForUser, fileWrappedKeys } = req.body;

    const result = await shareFolder({ folderId, ownerId, targetEmail: email, role, wrappedKeyForUser, fileWrappedKeys });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getFileSharesHandler = async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const ownerId = req.user.id;

    const shares = await getItemShares({ itemType: 'file', itemId: fileId, ownerId });
    return res.status(200).json(shares);
  } catch (error) {
    next(error);
  }
};

export const getFolderSharesHandler = async (req, res, next) => {
  try {
    const folderId = req.params.id;
    const ownerId = req.user.id;

    const shares = await getItemShares({ itemType: 'folder', itemId: folderId, ownerId });
    return res.status(200).json(shares);
  } catch (error) {
    next(error);
  }
};

export const updateShareRoleHandler = async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const ownerId = req.user.id;
    const { role } = req.body;

    const result = await updateShareRole({ shareId, ownerId, role });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const revokeShareHandler = async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const ownerId = req.user.id;

    const result = await revokeShare({ shareId, ownerId });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getSharedWithMeHandler = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await getSharedWithMe(userId);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
