import crypto from 'crypto';
import { File, Folder, FileVersion, FileShare } from '../models/index.js';
import { getPresignedUploadUrl, getPresignedDownloadUrl } from './s3.service.js';
import { createFileVersion, buildVersionS3Key } from './version.service.js';
import { softDeleteFile } from './trash.service.js';
import { getEffectiveFileRole, getEffectiveFolderRole } from './permission.service.js';

export const requestUploadUrl = async ({ name, mimeType, sizeInBytes, folderId, ownerId }) => {
  const targetFolderId = folderId || null;

  if (targetFolderId) {
    const parentRole = await getEffectiveFolderRole(ownerId, targetFolderId);
    if (parentRole !== 'owner' && parentRole !== 'editor') {
      const error = new Error('You do not have permission to upload files to this folder.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Check if active File already exists with same name in folder
  const existingFile = await File.findOne({
    where: { name, folderId: targetFolderId, deletedAt: null }
  });

  if (existingFile) {
    const fileRole = await getEffectiveFileRole(ownerId, existingFile.id);
    if (fileRole !== 'owner' && fileRole !== 'editor') {
      const error = new Error('You do not have permission to upload a new version of this file.');
      error.statusCode = 403;
      throw error;
    }
  }

  let fileId;
  let versionNumber;

  if (existingFile) {
    fileId = existingFile.id;
    const versionCount = await FileVersion.count({ where: { fileId } });
    versionNumber = versionCount + 1;
  } else {
    fileId = crypto.randomUUID();
    versionNumber = 1;
  }

  const s3Key = buildVersionS3Key(ownerId, fileId, versionNumber, name);

  const { uploadUrl } = await getPresignedUploadUrl({
    userId: ownerId,
    fileId,
    filename: name,
    mimeType,
    s3Key
  });

  let file;
  if (existingFile) {
    file = existingFile;
    file.s3Key = s3Key;
    file.sizeInBytes = sizeInBytes || existingFile.sizeInBytes || 0;
    file.mimeType = mimeType || existingFile.mimeType;
    await file.save();
  } else {
    file = await File.create({
      id: fileId,
      name,
      ownerId,
      folderId: targetFolderId,
      s3Key,
      sizeInBytes: sizeInBytes || 0,
      mimeType: mimeType || 'application/octet-stream'
    });
  }

  return {
    file,
    uploadUrl,
    s3Key
  };
};

export const confirmUpload = async ({ fileId, sizeInBytes, ownerId, wrappedKey = null, iv = null }) => {
  const role = await getEffectiveFileRole(ownerId, fileId);
  if (role !== 'owner' && role !== 'editor') {
    const error = new Error('You do not have permission to modify this file.');
    error.statusCode = 403;
    throw error;
  }

  const file = await File.findOne({
    where: { id: fileId, deletedAt: null }
  });

  if (!file) {
    const error = new Error('File record not found.');
    error.statusCode = 404;
    throw error;
  }

  await createFileVersion({
    fileId: file.id,
    s3Key: file.s3Key,
    sizeInBytes: typeof sizeInBytes === 'number' && sizeInBytes > 0 ? sizeInBytes : file.sizeInBytes,
    ownerId,
    wrappedKey,
    iv
  });

  await file.reload();
  return file;
};

export const getDownloadUrl = async ({ fileId, ownerId }) => {
  const role = await getEffectiveFileRole(ownerId, fileId);
  if (role === 'none') {
    const error = new Error('Access denied. You do not have permission to download this file.');
    error.statusCode = 403;
    throw error;
  }

  const file = await File.findOne({
    where: { id: fileId, deletedAt: null }
  });

  if (!file) {
    const error = new Error('File not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  let targetS3Key = file.s3Key;
  let wrappedKey = null;
  let iv = null;

  if (file.currentVersionId) {
    const currentVer = await FileVersion.findByPk(file.currentVersionId);
    if (currentVer) {
      targetS3Key = currentVer.s3Key;
      wrappedKey = currentVer.wrappedKey;
      iv = currentVer.iv;
    }
  }

  // If downloader is a shared user (not owner), look up their specific wrapped DEK
  if (file.ownerId !== ownerId) {
    const directShare = await FileShare.findOne({
      where: { fileId: file.id, sharedWithUserId: ownerId }
    });
    if (directShare && directShare.wrappedKeyForUser) {
      wrappedKey = directShare.wrappedKeyForUser;
    } else {
      // Check folder-level share if applicable
      const folderShare = await FileShare.findOne({
        where: { folderId: file.folderId, sharedWithUserId: ownerId }
      });
      if (folderShare && folderShare.wrappedKeyForUser) {
        wrappedKey = folderShare.wrappedKeyForUser;
      }
    }
  }

  const downloadUrl = await getPresignedDownloadUrl({
    s3Key: targetS3Key,
    filename: file.name
  });

  return {
    downloadUrl,
    file,
    wrappedKey,
    iv
  };
};

export const renameFile = async ({ fileId, name, ownerId }) => {
  const role = await getEffectiveFileRole(ownerId, fileId);
  if (role !== 'owner' && role !== 'editor') {
    const error = new Error('You do not have permission to rename this file.');
    error.statusCode = 403;
    throw error;
  }

  const file = await File.findOne({
    where: { id: fileId, deletedAt: null }
  });

  if (!file) {
    const error = new Error('File not found.');
    error.statusCode = 404;
    throw error;
  }

  file.name = name;
  await file.save();

  return file;
};

export const deleteFile = async ({ fileId, ownerId }) => {
  const file = await File.findOne({ where: { id: fileId, deletedAt: null } });
  if (!file) {
    const error = new Error('File not found.');
    error.statusCode = 404;
    throw error;
  }

  // Soft delete is OWNER ONLY
  if (file.ownerId !== ownerId) {
    const error = new Error('Only the owner of a file can move it to trash.');
    error.statusCode = 403;
    throw error;
  }

  return await softDeleteFile(fileId, ownerId);
};
