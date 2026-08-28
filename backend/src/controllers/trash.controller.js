import {
  getUserTrash,
  restoreFile,
  restoreFolder,
  permanentlyPurgeFile,
  permanentlyPurgeFolder
} from '../services/trash.service.js';

export const getTrash = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const trashContents = await getUserTrash(ownerId);
    return res.status(200).json(trashContents);
  } catch (error) {
    next(error);
  }
};

export const restoreFileHandler = async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const ownerId = req.user.id;
    const result = await restoreFile(fileId, ownerId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const restoreFolderHandler = async (req, res, next) => {
  try {
    const folderId = req.params.id;
    const ownerId = req.user.id;
    const result = await restoreFolder(folderId, ownerId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const purgeItemHandler = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const ownerId = req.user.id;

    if (type !== 'file' && type !== 'folder') {
      const error = new Error('Type must be either file or folder.');
      error.statusCode = 400;
      throw error;
    }

    if (type === 'file') {
      await permanentlyPurgeFile(id, ownerId);
    } else {
      await permanentlyPurgeFolder(id, ownerId);
    }

    return res.status(200).json({ message: 'Item permanently deleted.' });
  } catch (error) {
    next(error);
  }
};
