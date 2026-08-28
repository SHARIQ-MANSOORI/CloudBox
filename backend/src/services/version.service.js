import { File, FileVersion, User } from '../models/index.js';
import { deleteS3Object } from './s3.service.js';
import { getEffectiveFileRole } from './permission.service.js';

export const MAX_VERSIONS_PER_FILE = 20;

export const buildVersionS3Key = (userId, fileId, versionNumber, originalFilename) => {
  const safeFilename = originalFilename.replace(/[\/\\]/g, '_');
  return `${userId}/${fileId}/versions/${versionNumber}/${safeFilename}`;
};

export const createFileVersion = async ({ fileId, s3Key, sizeInBytes, ownerId, wrappedKey = null, iv = null }) => {
  const file = await File.findOne({ where: { id: fileId } });
  if (!file) {
    const error = new Error('File record not found.');
    error.statusCode = 404;
    throw error;
  }

  // Determine next version number
  const versionCount = await FileVersion.count({ where: { fileId } });
  const versionNumber = versionCount + 1;

  // Build version S3 key if raw key passed
  const versionS3Key = s3Key.includes('/versions/')
    ? s3Key
    : buildVersionS3Key(file.ownerId, fileId, versionNumber, file.name);

  // 1. Create FileVersion record
  const version = await FileVersion.create({
    fileId,
    s3Key: versionS3Key,
    sizeInBytes: sizeInBytes || file.sizeInBytes || 0,
    versionNumber,
    createdBy: ownerId,
    wrappedKey,
    iv
  });

  // 2. Repoint File record to current version
  file.currentVersionId = version.id;
  file.s3Key = versionS3Key;
  if (typeof sizeInBytes === 'number' && sizeInBytes > 0) {
    file.sizeInBytes = sizeInBytes;
  }
  await file.save();

  // 3. Inline Retention Cleanup Cap (Max 20 versions per file)
  const totalVersions = await FileVersion.count({ where: { fileId } });
  if (totalVersions > MAX_VERSIONS_PER_FILE) {
    const oldestVersion = await FileVersion.findOne({
      where: { fileId },
      order: [['versionNumber', 'ASC']]
    });

    if (oldestVersion && oldestVersion.id !== file.currentVersionId) {
      console.log(`[Version Retention] Cap exceeded (${totalVersions}/${MAX_VERSIONS_PER_FILE}). Purging oldest version #${oldestVersion.versionNumber} for file ${fileId}`);
      await deleteS3Object(oldestVersion.s3Key);
      await oldestVersion.destroy();
    }
  }

  return version;
};

export const getFileVersions = async ({ fileId, ownerId }) => {
  const role = await getEffectiveFileRole(ownerId, fileId);
  if (role === 'none') {
    const error = new Error('Access denied. You do not have permission to view version history for this file.');
    error.statusCode = 403;
    throw error;
  }

  const file = await File.findOne({ where: { id: fileId, deletedAt: null } });
  if (!file) {
    const error = new Error('File not found.');
    error.statusCode = 404;
    throw error;
  }

  const versions = await FileVersion.findAll({
    where: { fileId },
    include: [{
      model: User,
      as: 'uploader',
      attributes: ['id', 'email']
    }],
    order: [['versionNumber', 'DESC']]
  });

  return {
    file,
    currentVersionId: file.currentVersionId,
    versions: versions.map(v => ({
      id: v.id,
      versionNumber: v.versionNumber,
      sizeInBytes: v.sizeInBytes,
      s3Key: v.s3Key,
      wrappedKey: v.wrappedKey,
      iv: v.iv,
      createdAt: v.createdAt,
      createdBy: v.uploader ? v.uploader.email : 'Unknown',
      isCurrent: v.id === file.currentVersionId
    }))
  };
};

export const restoreFileVersion = async ({ fileId, versionId, ownerId }) => {
  const role = await getEffectiveFileRole(ownerId, fileId);
  if (role !== 'owner' && role !== 'editor') {
    const error = new Error('You do not have permission to restore older versions of this file.');
    error.statusCode = 403;
    throw error;
  }

  const file = await File.findOne({ where: { id: fileId, deletedAt: null } });
  if (!file) {
    const error = new Error('File not found.');
    error.statusCode = 404;
    throw error;
  }

  const targetVersion = await FileVersion.findOne({
    where: { id: versionId, fileId }
  });

  if (!targetVersion) {
    const error = new Error('Selected version not found.');
    error.statusCode = 404;
    throw error;
  }

  // Repoint currentVersionId and File pointers to selected version
  file.currentVersionId = targetVersion.id;
  file.s3Key = targetVersion.s3Key;
  file.sizeInBytes = targetVersion.sizeInBytes;
  await file.save();

  return {
    message: `Restored Version #${targetVersion.versionNumber} as current.`,
    file,
    currentVersion: targetVersion
  };
};
