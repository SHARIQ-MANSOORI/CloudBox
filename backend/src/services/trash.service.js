import { Op } from 'sequelize';
import { File, Folder, FileVersion } from '../models/index.js';
import { deleteS3Object } from './s3.service.js';

const TRASH_RETENTION_DAYS = 30;

const getTrashExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + TRASH_RETENTION_DAYS);
  return date;
};

export const softDeleteFile = async (fileId, ownerId) => {
  const file = await File.findOne({ where: { id: fileId, ownerId } });
  if (!file) {
    const error = new Error('File not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  file.deletedAt = new Date();
  file.trashExpiresAt = getTrashExpiryDate();
  await file.save();

  return { message: 'File moved to trash.' };
};

export const softDeleteFolder = async (folderId, ownerId) => {
  const folder = await Folder.findOne({ where: { id: folderId, ownerId } });
  if (!folder) {
    const error = new Error('Folder not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  const deletedAt = new Date();
  const trashExpiresAt = getTrashExpiryDate();

  const softDeleteFolderRecursive = async (targetFolderId) => {
    // Soft delete current folder
    await Folder.update(
      { deletedAt, trashExpiresAt },
      { where: { id: targetFolderId, ownerId } }
    );

    // Soft delete files in current folder
    await File.update(
      { deletedAt, trashExpiresAt },
      { where: { folderId: targetFolderId, ownerId } }
    );

    // Recursively soft delete subfolders
    const subfolders = await Folder.findAll({
      where: { parentFolderId: targetFolderId, ownerId },
      attributes: ['id']
    });

    for (const sub of subfolders) {
      await softDeleteFolderRecursive(sub.id);
    }
  };

  await softDeleteFolderRecursive(folderId);

  return { message: 'Folder and contents moved to trash.' };
};

export const getUserTrash = async (ownerId) => {
  const now = Date.now();

  const rawFolders = await Folder.findAll({
    where: {
      ownerId,
      deletedAt: { [Op.ne]: null }
    },
    order: [['deletedAt', 'DESC']]
  });

  const rawFiles = await File.findAll({
    where: {
      ownerId,
      deletedAt: { [Op.ne]: null }
    },
    order: [['deletedAt', 'DESC']]
  });

  const folders = rawFolders.map(f => {
    const expTime = f.trashExpiresAt ? new Date(f.trashExpiresAt).getTime() : now;
    const daysRemaining = Math.max(0, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));
    return {
      id: f.id,
      name: f.name,
      type: 'folder',
      deletedAt: f.deletedAt,
      trashExpiresAt: f.trashExpiresAt,
      daysRemaining
    };
  });

  const files = rawFiles.map(f => {
    const expTime = f.trashExpiresAt ? new Date(f.trashExpiresAt).getTime() : now;
    const daysRemaining = Math.max(0, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));
    return {
      id: f.id,
      name: f.name,
      type: 'file',
      sizeInBytes: f.sizeInBytes,
      mimeType: f.mimeType,
      deletedAt: f.deletedAt,
      trashExpiresAt: f.trashExpiresAt,
      daysRemaining
    };
  });

  return {
    folders,
    files
  };
};

export const restoreFile = async (fileId, ownerId) => {
  const file = await File.findOne({ where: { id: fileId, ownerId } });
  if (!file) {
    const error = new Error('File not found in trash.');
    error.statusCode = 404;
    throw error;
  }

  // Restore file
  file.deletedAt = null;
  file.trashExpiresAt = null;

  // Check parent folder chain; if parent folder is soft-deleted, restore it as well!
  if (file.folderId) {
    let currParentId = file.folderId;
    while (currParentId) {
      const parentFolder = await Folder.findOne({ where: { id: currParentId, ownerId } });
      if (parentFolder && parentFolder.deletedAt) {
        parentFolder.deletedAt = null;
        parentFolder.trashExpiresAt = null;
        await parentFolder.save();
        currParentId = parentFolder.parentFolderId;
      } else {
        currParentId = null;
      }
    }
  }

  await file.save();

  return { message: 'File restored successfully.', file };
};

export const restoreFolder = async (folderId, ownerId) => {
  const folder = await Folder.findOne({ where: { id: folderId, ownerId } });
  if (!folder) {
    const error = new Error('Folder not found in trash.');
    error.statusCode = 404;
    throw error;
  }

  const restoreFolderRecursive = async (targetFolderId) => {
    // Restore folder
    await Folder.update(
      { deletedAt: null, trashExpiresAt: null },
      { where: { id: targetFolderId, ownerId } }
    );

    // Restore files in folder
    await File.update(
      { deletedAt: null, trashExpiresAt: null },
      { where: { folderId: targetFolderId, ownerId } }
    );

    // Restore subfolders
    const subfolders = await Folder.findAll({
      where: { parentFolderId: targetFolderId, ownerId },
      attributes: ['id']
    });

    for (const sub of subfolders) {
      await restoreFolderRecursive(sub.id);
    }
  };

  // Restore parent folder chain first if ancestor was deleted
  let currParentId = folder.parentFolderId;
  while (currParentId) {
    const ancestor = await Folder.findOne({ where: { id: currParentId, ownerId } });
    if (ancestor && ancestor.deletedAt) {
      ancestor.deletedAt = null;
      ancestor.trashExpiresAt = null;
      await ancestor.save();
      currParentId = ancestor.parentFolderId;
    } else {
      currParentId = null;
    }
  }

  await restoreFolderRecursive(folderId);

  return { message: 'Folder and contents restored successfully.' };
};

export const permanentlyPurgeFile = async (fileId, ownerId) => {
  const file = await File.findOne({ where: { id: fileId, ownerId } });
  if (!file) {
    return false;
  }

  // 1. Fetch all versions for file
  const versions = await FileVersion.findAll({ where: { fileId } });

  // 2. Delete S3 objects for all versions
  for (const ver of versions) {
    try {
      await deleteS3Object(ver.s3Key);
    } catch (err) {
      console.warn(`[Purge Warning] Failed to delete S3 key ${ver.s3Key}:`, err.message);
    }
  }

  // Delete primary file s3Key if not in versions
  if (file.s3Key && !versions.some(v => v.s3Key === file.s3Key)) {
    try {
      await deleteS3Object(file.s3Key);
    } catch (err) {
      // Ignore
    }
  }

  // 3. Destroy FileVersion records & File record
  await FileVersion.destroy({ where: { fileId } });
  await file.destroy();

  return true;
};

export const permanentlyPurgeFolder = async (folderId, ownerId) => {
  const folder = await Folder.findOne({ where: { id: folderId, ownerId } });
  if (!folder) {
    return false;
  }

  const purgeFolderRecursive = async (targetFolderId) => {
    // Purge files in target folder
    const files = await File.findAll({ where: { folderId: targetFolderId, ownerId }, attributes: ['id'] });
    for (const f of files) {
      await permanentlyPurgeFile(f.id, ownerId);
    }

    // Purge subfolders recursively
    const subfolders = await Folder.findAll({ where: { parentFolderId: targetFolderId, ownerId }, attributes: ['id'] });
    for (const sub of subfolders) {
      await purgeFolderRecursive(sub.id);
    }

    // Destroy folder
    await Folder.destroy({ where: { id: targetFolderId, ownerId } });
  };

  await purgeFolderRecursive(folderId);
  return true;
};

/**
 * Shared automated purge function for node-cron daily cleanup
 */
export const purgeExpiredTrash = async () => {
  const now = new Date();

  // Find expired files
  const expiredFiles = await File.findAll({
    where: {
      trashExpiresAt: { [Op.lte]: now }
    }
  });

  let purgedFilesCount = 0;
  for (const file of expiredFiles) {
    const success = await permanentlyPurgeFile(file.id, file.ownerId);
    if (success) purgedFilesCount++;
  }

  // Find expired folders
  const expiredFolders = await Folder.findAll({
    where: {
      trashExpiresAt: { [Op.lte]: now }
    }
  });

  let purgedFoldersCount = 0;
  for (const folder of expiredFolders) {
    const success = await permanentlyPurgeFolder(folder.id, folder.ownerId);
    if (success) purgedFoldersCount++;
  }

  console.log(`[Trash Cleanup Cron] Purged ${purgedFilesCount} expired files and ${purgedFoldersCount} expired folders.`);
  return { purgedFilesCount, purgedFoldersCount };
};
