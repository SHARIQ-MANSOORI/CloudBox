import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, BUCKET_NAME, isAwsConfigured } from '../config/s3.js';
import crypto from 'crypto';

/**
 * Builds S3 Key adhering to key prefix format: {userId}/{fileId}/{originalFilename}
 */
export const buildS3Key = (userId, fileId, originalFilename) => {
  const safeFilename = originalFilename.replace(/[\/\\]/g, '_');
  return `${userId}/${fileId}/${safeFilename}`;
};

/**
 * Single-shot presigned PUT URL generator (Phase 2 compatibility)
 */
export const getPresignedUploadUrl = async ({ userId, fileId, filename, mimeType, s3Key: customS3Key }) => {
  const s3Key = customS3Key || buildS3Key(userId, fileId, filename);

  if (!isAwsConfigured) {
    console.warn(`[S3 Service] AWS credentials not configured. Returning local development upload URL fallback for key: ${s3Key}`);
    return {
      uploadUrl: `http://localhost:5000/api/files/mock-s3-upload?key=${encodeURIComponent(s3Key)}`,
      s3Key
    };
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: mimeType || 'application/octet-stream'
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return {
    uploadUrl,
    s3Key
  };
};

/**
 * Generates a presigned GET URL for direct file download
 */
export const getPresignedDownloadUrl = async ({ s3Key, filename }) => {
  if (!isAwsConfigured) {
    console.warn(`[S3 Service] AWS credentials not configured. Returning local development download URL fallback for key: ${s3Key}`);
    return `http://localhost:5000/api/files/mock-s3-download?key=${encodeURIComponent(s3Key)}&name=${encodeURIComponent(filename)}`;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 900 });
};

/**
 * Deletes object from AWS S3 bucket
 */
export const deleteS3Object = async (s3Key) => {
  if (!isAwsConfigured) {
    console.log(`[S3 Service] Mock delete S3 object key: ${s3Key}`);
    return true;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error(`[S3 Service] Error deleting object from S3 (${s3Key}):`, error.message);
    throw error;
  }
};

// ==========================================
// PHASE 3: S3 MULTIPART UPLOAD API METHODS
// ==========================================

/**
 * Initiates an S3 Multipart Upload session
 */
export const initiateMultipartUpload = async ({ userId, fileId, filename, mimeType, s3Key: customS3Key }) => {
  const s3Key = customS3Key || buildS3Key(userId, fileId, filename);

  if (!isAwsConfigured) {
    const mockUploadId = `mock_upload_${crypto.randomUUID()}`;
    console.warn(`[S3 Service] AWS not configured. Mock CreateMultipartUpload initiated: ${mockUploadId}`);
    return {
      s3UploadId: mockUploadId,
      s3Key
    };
  }

  const command = new CreateMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: mimeType || 'application/octet-stream'
  });

  const response = await s3Client.send(command);
  return {
    s3UploadId: response.UploadId,
    s3Key
  };
};

/**
 * Generates a presigned UploadPart URL for a specific chunk part number
 */
export const getPresignedUploadPartUrl = async ({ s3Key, s3UploadId, partNumber }) => {
  if (!isAwsConfigured) {
    return `http://localhost:5000/api/files/mock-s3-upload?key=${encodeURIComponent(s3Key)}&uploadId=${s3UploadId}&partNumber=${partNumber}`;
  }

  const command = new UploadPartCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    UploadId: s3UploadId,
    PartNumber: partNumber
  });

  // Presigned URL valid for 15 minutes
  return await getSignedUrl(s3Client, command, { expiresIn: 900 });
};

/**
 * Completes an S3 Multipart Upload session with collected parts
 */
export const completeMultipartUpload = async ({ s3Key, s3UploadId, parts }) => {
  if (!isAwsConfigured) {
    console.warn(`[S3 Service] Mock CompleteMultipartUpload completed for uploadId: ${s3UploadId}`);
    return { Location: `mock://${BUCKET_NAME}/${s3Key}`, Key: s3Key };
  }

  // Sort parts by PartNumber as required by AWS S3 API
  const sortedParts = [...parts]
    .map(p => ({
      PartNumber: p.partNumber || p.PartNumber,
      ETag: p.eTag || p.ETag
    }))
    .sort((a, b) => a.PartNumber - b.PartNumber);

  const command = new CompleteMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    UploadId: s3UploadId,
    MultipartUpload: {
      Parts: sortedParts
    }
  });

  return await s3Client.send(command);
};

/**
 * Aborts an in-progress S3 Multipart Upload session
 */
export const abortMultipartUpload = async ({ s3Key, s3UploadId }) => {
  if (!isAwsConfigured) {
    console.warn(`[S3 Service] Mock AbortMultipartUpload aborted for uploadId: ${s3UploadId}`);
    return true;
  }

  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      UploadId: s3UploadId
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error(`[S3 Service] Error aborting multipart upload (${s3UploadId}):`, error.message);
    throw error;
  }
};
