import { Folder, File, FileShare } from '../models/index.js';
import { getEffectiveFolderRole, getEffectiveFileRole } from './permission.service.js';
import { softDeleteFolder } from './trash.service.js';

export const createFolder = async ({ name, parentFolderId, ownerId }) => {
  if (parentFolderId && parentFolderId !== 'root') {
    const parentRole = await getEffectiveFolderRole(ownerId, parentFolderId);
    if (parentRole !== 'owner' && parentRole !== 'editor') {
      const error = new Error('You do not have permission to create folders in this location.');
      error.statusCode = 403;
      throw error;
    }
  }

  const folder = await Folder.create({
    name,
    parentFolderId: parentFolderId || null,
    ownerId
  });

  return folder;
};

export const getFolderContents = async ({ folderId, ownerId }) => {
  let currentFolder = null;
  const breadcrumbs = [{ id: 'root', name: 'Home' }];

  if (folderId && folderId !== 'root') {
    // Check permission to view folder
    const effectiveRole = await getEffectiveFolderRole(ownerId, folderId);
    if (effectiveRole === 'none') {
      const error = new Error('Access denied. You do not have permission to access this folder.');
      error.statusCode = 403;
      throw error;
    }

    currentFolder = await Folder.findOne({
      where: { id: folderId, deletedAt: null }
    });

    if (!currentFolder) {
      const error = new Error('Folder not found or has been moved to trash.');
      error.statusCode = 404;
      throw error;
    }

    // Construct breadcrumb trail
    const pathTrail = [];
    let curr = currentFolder;
    while (curr) {
      pathTrail.unshift({ id: curr.id, name: curr.name });
      if (curr.parentFolderId) {
        curr = await Folder.findOne({ where: { id: curr.parentFolderId, deletedAt: null } });
      } else {
        curr = null;
      }
    }
    breadcrumbs.push(...pathTrail);
  }

  const targetFolderId = currentFolder ? currentFolder.id : null;

  // Filter out soft-deleted items
  let folders;
  let files;

  if (!targetFolderId) {
    // Root level: Return items user owns + root items directly shared with user
    folders = await Folder.findAll({
      where: { parentFolderId: null, ownerId, deletedAt: null },
      order: [['name', 'ASC']]
    });

    files = await File.findAll({
      where: { folderId: null, ownerId, deletedAt: null },
      order: [['name', 'ASC']]
    });
  } else {
    folders = await Folder.findAll({
      where: { parentFolderId: targetFolderId, deletedAt: null },
      order: [['name', 'ASC']]
    });

    files = await File.findAll({
      where: { folderId: targetFolderId, deletedAt: null },
      order: [['name', 'ASC']]
    });
  }

  // Attach userRole and isShared flag to folders and files
  const foldersWithRoles = await Promise.all(folders.map(async (f) => {
    const role = await getEffectiveFolderRole(ownerId, f.id);
    const isShared = f.ownerId !== ownerId || (await FileShare.count({ where: { folderId: f.id } })) > 0;
    return {
      ...f.toJSON(),
      userRole: role,
      isShared
    };
  }));

  const filesWithRoles = await Promise.all(files.map(async (fi) => {
    const role = await getEffectiveFileRole(ownerId, fi.id);
    const isShared = fi.ownerId !== ownerId || (await FileShare.count({ where: { fileId: fi.id } })) > 0;
    return {
      ...fi.toJSON(),
      userRole: role,
      isShared
    };
  }));

  const currentFolderRole = currentFolder ? await getEffectiveFolderRole(ownerId, currentFolder.id) : 'owner';

  return {
    folder: currentFolder ? { ...currentFolder.toJSON(), userRole: currentFolderRole } : null,
    parentFolderId: currentFolder ? currentFolder.parentFolderId : null,
    breadcrumbs,
    folders: foldersWithRoles,
    files: filesWithRoles,
    userRole: currentFolderRole
  };
};

export const renameFolder = async ({ folderId, name, ownerId }) => {
  const role = await getEffectiveFolderRole(ownerId, folderId);
  if (role !== 'owner' && role !== 'editor') {
    const error = new Error('You do not have permission to rename this folder.');
    error.statusCode = 403;
    throw error;
  }

  const folder = await Folder.findOne({
    where: { id: folderId, deletedAt: null }
  });

  if (!folder) {
    const error = new Error('Folder not found.');
    error.statusCode = 404;
    throw error;
  }

  folder.name = name;
  await folder.save();

  return folder;
};

export const deleteFolder = async ({ folderId, ownerId }) => {
  const folder = await Folder.findOne({ where: { id: folderId, deletedAt: null } });
  if (!folder) {
    const error = new Error('Folder not found.');
    error.statusCode = 404;
    throw error;
  }

  // Soft-delete is OWNER ONLY
  if (folder.ownerId !== ownerId) {
    const error = new Error('Only the owner of a folder can move it to trash.');
    error.statusCode = 403;
    throw error;
  }

  return await softDeleteFolder(folderId, ownerId);
};
