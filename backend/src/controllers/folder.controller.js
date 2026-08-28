import * as folderService from '../services/folder.service.js';

export const createFolder = async (req, res, next) => {
  try {
    const ownerId = req.user.userId;
    const { name, parentFolderId } = req.body;
    const folder = await folderService.createFolder({ name, parentFolderId, ownerId });
    return res.status(201).json({
      success: true,
      message: 'Folder created successfully.',
      folder
    });
  } catch (error) {
    next(error);
  }
};

export const getFolderContents = async (req, res, next) => {
  try {
    const ownerId = req.user.userId;
    const { id } = req.params;
    const result = await folderService.getFolderContents({ folderId: id, ownerId });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const renameFolder = async (req, res, next) => {
  try {
    const ownerId = req.user.userId;
    const { id } = req.params;
    const { name } = req.body;
    const folder = await folderService.renameFolder({ folderId: id, name, ownerId });
    return res.status(200).json({
      success: true,
      message: 'Folder renamed successfully.',
      folder
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFolder = async (req, res, next) => {
  try {
    const ownerId = req.user.userId;
    const { id } = req.params;
    const result = await folderService.deleteFolder({ folderId: id, ownerId });
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};
