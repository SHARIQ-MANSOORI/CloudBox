import crypto from 'crypto';
import { UploadSession, File, Folder, FileVersion } from '../models/index.js';
import {
  initiateMultipartUpload,
  getPresignedUploadPartUrl,
  completeMultipartUpload,
  abortMultipartUpload
} from './s3.service.js';
import { createFileVersion, buildVersionS3Key } from './version.service.js';
import { getEffectiveFolderRole, getEffectiveFileRole } from './permission.service.js';

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB minimum part size for AWS S3

export const initUpload = async ({ filename, mimeType, totalSize, folderId, userId, wrappedKey = null, iv = null }) => {
  const targetFolderId = folderId || null;
  if (targetFolderId) {
    const parentRole = await getEffectiveFolderRole(userId, targetFolderId);
    if (parentRole !== 'owner' && parentRole !== 'editor') {
      const error = new Error('You do not have permission to upload files to this folder.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Check if active file already exists in target folder
  const existingFile = await File.findOne({
    where: { name: filename, folderId: targetFolderId, deletedAt: null }
  });

  if (existingFile) {
    const fileRole = await getEffectiveFileRole(userId, existingFile.id);
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

  const s3Key = buildVersionS3Key(userId, fileId, versionNumber, filename);
  const totalChunks = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));

  // 1. Initiate AWS S3 Multipart Upload
  const { s3UploadId } = await initiateMultipartUpload({
    userId,
    fileId,
    filename,
    mimeType,
    s3Key
  });

  // 2. Create or Update DB File record
  let file;
  if (existingFile) {
    file = existingFile;
    file.s3Key = s3Key;
    file.sizeInBytes = totalSize;
    file.mimeType = mimeType || existingFile.mimeType;
    await file.save();
  } else {
    file = await File.create({
      id: fileId,
      name: filename,
      ownerId: userId,
      folderId: targetFolderId,
      s3Key,
      sizeInBytes: totalSize,
      mimeType: mimeType || 'application/octet-stream'
    });
  }

  // 3. Create UploadSession record
  const session = await UploadSession.create({
    fileId,
    userId,
    s3UploadId,
    s3Key,
    totalChunks,
    completedParts: [],
    status: 'in-progress',
    wrappedKey,
    iv
  });

  return {
    sessionId: session.id,
    fileId,
    s3UploadId,
    s3Key,
    chunkSize: CHUNK_SIZE,
    totalChunks
  };
};

export const getPartUrl = async ({ sessionId, partNumber, userId }) => {
  const session = await UploadSession.findOne({
    where: { id: sessionId, userId }
  });

  if (!session) {
    const error = new Error('Upload session not found.');
    error.statusCode = 404;
    throw error;
  }

  if (session.status !== 'in-progress') {
    const error = new Error(`Upload session is ${session.status}. Cannot request part URLs.`);
    error.statusCode = 400;
    throw error;
  }

  const partUrl = await getPresignedUploadPartUrl({
    s3Key: session.s3Key,
    s3UploadId: session.s3UploadId,
    partNumber
  });

  return {
    partNumber,
    partUrl
  };
};

export const completePart = async ({ sessionId, partNumber, eTag, userId }) => {
  const session = await UploadSession.findOne({
    where: { id: sessionId, userId }
  });

  if (!session) {
    const error = new Error('Upload session not found.');
    error.statusCode = 404;
    throw error;
  }

  if (session.status !== 'in-progress') {
    const error = new Error(`Upload session is ${session.status}.`);
    error.statusCode = 400;
    throw error;
  }

  const currentParts = Array.isArray(session.completedParts) ? [...session.completedParts] : [];
  const existingIdx = currentParts.findIndex(p => p.partNumber === partNumber);

  // Strip extraneous quotes if present in ETag header
  const cleanETag = eTag.replace(/^"|"$/g, '');

  if (existingIdx >= 0) {
    currentParts[existingIdx] = { partNumber, eTag: cleanETag };
  } else {
    currentParts.push({ partNumber, eTag: cleanETag });
  }

  session.completedParts = currentParts;
  session.changed('completedParts', true);
  await session.save();

  return {
    message: 'Part upload confirmed.',
    completedParts: session.completedParts
  };
};

export const completeUpload = async ({ sessionId, userId }) => {
  const session = await UploadSession.findOne({
    where: { id: sessionId, userId }
  });

  if (!session) {
    const error = new Error('Upload session not found.');
    error.statusCode = 404;
    throw error;
  }

  if (session.status !== 'in-progress') {
    const error = new Error(`Upload session is already ${session.status}.`);
    error.statusCode = 400;
    throw error;
  }

  // 1. Send CompleteMultipartUpload to AWS S3
  await completeMultipartUpload({
    s3Key: session.s3Key,
    s3UploadId: session.s3UploadId,
    parts: session.completedParts
  });

  // 2. Mark UploadSession as completed
  session.status = 'completed';
  await session.save();

  // 3. Create FileVersion record and update File.currentVersionId pointer + 20-version retention cap
  const file = await File.findByPk(session.fileId);
  if (file) {
    await createFileVersion({
      fileId: file.id,
      s3Key: session.s3Key,
      sizeInBytes: file.sizeInBytes,
      ownerId: userId,
      wrappedKey: session.wrappedKey,
      iv: session.iv
    });
    await file.reload();
  }

  return {
    message: 'Multipart upload completed successfully.',
    file
  };
};

export const getSessionStatus = async ({ sessionId, userId }) => {
  const session = await UploadSession.findOne({
    where: { id: sessionId, userId }
  });

  if (!session) {
    const error = new Error('Upload session not found.');
    error.statusCode = 404;
    throw error;
  }

  return {
    sessionId: session.id,
    fileId: session.fileId,
    status: session.status,
    totalChunks: session.totalChunks,
    completedParts: session.completedParts || [],
    s3Key: session.s3Key
  };
};

export const abortUpload = async ({ sessionId, userId }) => {
  const session = await UploadSession.findOne({
    where: { id: sessionId, userId }
  });

  if (!session) {
    const error = new Error('Upload session not found.');
    error.statusCode = 404;
    throw error;
  }

  // 1. Send AbortMultipartUpload to S3
  await abortMultipartUpload({
    s3Key: session.s3Key,
    s3UploadId: session.s3UploadId
  });

  // 2. Mark session aborted
  session.status = 'aborted';
  await session.save();

  // 3. Delete pending DB File record if it has no versions created yet
  const versionCount = await FileVersion.count({ where: { fileId: session.fileId } });
  if (versionCount === 0) {
    await File.destroy({
      where: { id: session.fileId, ownerId: userId }
    });
  }

  return {
    message: 'Upload session aborted and cleaned up.'
  };
};
