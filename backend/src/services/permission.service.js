import { File, Folder, FileShare } from '../models/index.js';

/**
 * Determines the effective permission role for a user on a given folder.
 * Returns: 'owner' | 'editor' | 'viewer' | 'none'
 */
export const getEffectiveFolderRole = async (userId, folderId) => {
  if (!folderId || folderId === 'root') {
    return 'owner'; // Root space access is owned by current user
  }

  const folder = await Folder.findOne({ where: { id: folderId, deletedAt: null } });
  if (!folder) {
    return 'none';
  }

  // 1. Owner check
  if (folder.ownerId === userId) {
    return 'owner';
  }

  // 2. Explicit folder-level share check
  const directShare = await FileShare.findOne({
    where: { folderId, sharedWithUserId: userId }
  });
  if (directShare) {
    return directShare.role; // 'editor' or 'viewer'
  }

  // 3. Parent folder hierarchy cascade check
  let currentParentId = folder.parentFolderId;
  while (currentParentId) {
    const parentFolder = await Folder.findOne({ where: { id: currentParentId, deletedAt: null } });
    if (!parentFolder) break;

    if (parentFolder.ownerId === userId) {
      return 'owner';
    }

    const parentShare = await FileShare.findOne({
      where: { folderId: currentParentId, sharedWithUserId: userId }
    });
    if (parentShare) {
      return parentShare.role;
    }

    currentParentId = parentFolder.parentFolderId;
  }

  return 'none';
};

/**
 * Determines the effective permission role for a user on a given file.
 * Specific file-level shares take precedence over inherited folder-level shares.
 * Returns: 'owner' | 'editor' | 'viewer' | 'none'
 */
export const getEffectiveFileRole = async (userId, fileId) => {
  const file = await File.findOne({ where: { id: fileId, deletedAt: null } });
  if (!file) {
    return 'none';
  }

  // 1. Owner check
  if (file.ownerId === userId) {
    return 'owner';
  }

  // 2. Specific file-level share check (overrides folder-level share)
  const directFileShare = await FileShare.findOne({
    where: { fileId, sharedWithUserId: userId }
  });
  if (directFileShare) {
    return directFileShare.role; // 'editor' or 'viewer'
  }

  // 3. Inherited folder-level share check
  if (file.folderId) {
    const inheritedRole = await getEffectiveFolderRole(userId, file.folderId);
    if (inheritedRole !== 'none') {
      return inheritedRole;
    }
  }

  return 'none';
};
