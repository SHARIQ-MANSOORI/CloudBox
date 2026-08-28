import { FileShare, File, Folder, User } from '../models/index.js';
import { getEffectiveFileRole, getEffectiveFolderRole } from './permission.service.js';

export const shareFile = async ({ fileId, ownerId, targetEmail, role, wrappedKeyForUser = null }) => {
  const file = await File.findOne({ where: { id: fileId, ownerId, deletedAt: null } });
  if (!file) {
    const error = new Error('File not found or you are not authorized to share this item.');
    error.statusCode = 403;
    throw error;
  }

  const targetUser = await User.findOne({ where: { email: targetEmail } });
  if (!targetUser) {
    const error = new Error(`No registered CloudBox user found with email "${targetEmail}".`);
    error.statusCode = 404;
    throw error;
  }

  if (targetUser.id === ownerId) {
    const error = new Error('You are already the owner of this file.');
    error.statusCode = 400;
    throw error;
  }

  const [share, created] = await FileShare.findOrCreate({
    where: { fileId, sharedWithUserId: targetUser.id },
    defaults: {
      fileId,
      ownerId,
      sharedWithUserId: targetUser.id,
      role: role === 'editor' ? 'editor' : 'viewer',
      wrappedKeyForUser
    }
  });

  if (!created) {
    share.role = role === 'editor' ? 'editor' : 'viewer';
    if (wrappedKeyForUser) {
      share.wrappedKeyForUser = wrappedKeyForUser;
    }
    await share.save();
  }

  return { message: `Successfully shared "${file.name}" with ${targetEmail} as ${share.role}.`, share };
};

export const shareFolder = async ({ folderId, ownerId, targetEmail, role, wrappedKeyForUser = null, fileWrappedKeys = null }) => {
  const folder = await Folder.findOne({ where: { id: folderId, ownerId, deletedAt: null } });
  if (!folder) {
    const error = new Error('Folder not found or you are not authorized to share this item.');
    error.statusCode = 403;
    throw error;
  }

  const targetUser = await User.findOne({ where: { email: targetEmail } });
  if (!targetUser) {
    const error = new Error(`No registered CloudBox user found with email "${targetEmail}".`);
    error.statusCode = 404;
    throw error;
  }

  if (targetUser.id === ownerId) {
    const error = new Error('You are already the owner of this folder.');
    error.statusCode = 400;
    throw error;
  }

  const [share, created] = await FileShare.findOrCreate({
    where: { folderId, sharedWithUserId: targetUser.id },
    defaults: {
      folderId,
      ownerId,
      sharedWithUserId: targetUser.id,
      role: role === 'editor' ? 'editor' : 'viewer',
      wrappedKeyForUser
    }
  });

  if (!created) {
    share.role = role === 'editor' ? 'editor' : 'viewer';
    if (wrappedKeyForUser) {
      share.wrappedKeyForUser = wrappedKeyForUser;
    }
    await share.save();
  }

  // If client provided per-file re-wrapped DEKs for files within this shared folder, store them as file-level shares
  if (fileWrappedKeys && typeof fileWrappedKeys === 'object') {
    for (const [fileId, keyForUser] of Object.entries(fileWrappedKeys)) {
      if (keyForUser) {
        const [fShare, fCreated] = await FileShare.findOrCreate({
          where: { fileId, sharedWithUserId: targetUser.id },
          defaults: {
            fileId,
            ownerId,
            sharedWithUserId: targetUser.id,
            role: role === 'editor' ? 'editor' : 'viewer',
            wrappedKeyForUser: keyForUser
          }
        });
        if (!fCreated) {
          fShare.wrappedKeyForUser = keyForUser;
          await fShare.save();
        }
      }
    }
  }

  return { message: `Successfully shared folder "${folder.name}" with ${targetEmail} as ${share.role}.`, share };
};

export const getItemShares = async ({ itemType, itemId, ownerId }) => {
  if (itemType === 'file') {
    const file = await File.findOne({ where: { id: itemId, ownerId, deletedAt: null } });
    if (!file) {
      const error = new Error('File not found or access denied.');
      error.statusCode = 403;
      throw error;
    }
    const shares = await FileShare.findAll({
      where: { fileId: itemId },
      include: [{ model: User, as: 'sharedWithUser', attributes: ['id', 'email'] }]
    });
    return shares;
  } else {
    const folder = await Folder.findOne({ where: { id: itemId, ownerId, deletedAt: null } });
    if (!folder) {
      const error = new Error('Folder not found or access denied.');
      error.statusCode = 403;
      throw error;
    }
    const shares = await FileShare.findAll({
      where: { folderId: itemId },
      include: [{ model: User, as: 'sharedWithUser', attributes: ['id', 'email'] }]
    });
    return shares;
  }
};

export const updateShareRole = async ({ shareId, ownerId, role }) => {
  const share = await FileShare.findOne({ where: { id: shareId, ownerId } });
  if (!share) {
    const error = new Error('Share record not found or access denied.');
    error.statusCode = 403;
    throw error;
  }

  share.role = role === 'editor' ? 'editor' : 'viewer';
  await share.save();

  return { message: 'Collaborator role updated successfully.', share };
};

export const revokeShare = async ({ shareId, ownerId }) => {
  const share = await FileShare.findOne({ where: { id: shareId, ownerId } });
  if (!share) {
    const error = new Error('Share record not found or access denied.');
    error.statusCode = 403;
    throw error;
  }

  await share.destroy();
  return { message: 'Collaborator access revoked successfully.' };
};

export const getSharedWithMe = async (userId) => {
  const rawShares = await FileShare.findAll({
    where: { sharedWithUserId: userId },
    include: [
      {
        model: File,
        as: 'file',
        where: { deletedAt: null },
        required: false,
        include: [{ model: User, as: 'owner', attributes: ['id', 'email'] }]
      },
      {
        model: Folder,
        as: 'folder',
        where: { deletedAt: null },
        required: false,
        include: [{ model: User, as: 'owner', attributes: ['id', 'email'] }]
      },
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'email']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  const sharedFolders = [];
  const sharedFiles = [];

  for (const s of rawShares) {
    if (s.folder && s.folder.deletedAt === null) {
      const effectiveRole = await getEffectiveFolderRole(userId, s.folder.id);
      sharedFolders.push({
        id: s.folder.id,
        name: s.folder.name,
        type: 'folder',
        ownerEmail: s.owner ? s.owner.email : 'Unknown',
        role: effectiveRole,
        shareId: s.id,
        createdAt: s.createdAt
      });
    } else if (s.file && s.file.deletedAt === null) {
      const effectiveRole = await getEffectiveFileRole(userId, s.file.id);
      sharedFiles.push({
        id: s.file.id,
        name: s.file.name,
        type: 'file',
        sizeInBytes: s.file.sizeInBytes,
        mimeType: s.file.mimeType,
        ownerEmail: s.owner ? s.owner.email : 'Unknown',
        role: effectiveRole,
        shareId: s.id,
        createdAt: s.createdAt
      });
    }
  }

  return {
    folders: sharedFolders,
    files: sharedFiles
  };
};
