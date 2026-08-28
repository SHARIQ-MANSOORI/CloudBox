import * as fileService from '../services/file.service.js';

export const requestUploadUrl = async (req, res, next) => {
  try {
    const ownerId = req.user.userId;
    const { name, mimeType, sizeInBytes, folderId } = req.body;
    const result = await fileService.requestUploadUrl({ name, mimeType, sizeInBytes, folderId, ownerId });
    return res.status(201).json({
      success: true,
      message: 'Presigned upload URL generated successfully.',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const confirmUpload = async (req, res, next) => {
  try {
    const ownerId = req.user.userId;
    const { id } = req.params;
    const { sizeInBytes, wrappedKey, iv } = req.body;
    const file = await fileService.confirmUpload({ fileId: id, sizeInBytes, ownerId, wrappedKey, iv });
    return res.status(200).json({
      success: true,
      message: 'File upload confirmed.',
      file
    });
  } catch (error) {
    next(error);
  }
};

export const getDownloadUrl = async (req, res, next) => {
  try {
    const ownerId = req.user.userId;
    const { id } = req.params;
    const result = await fileService.getDownloadUrl({ fileId: id, ownerId });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const renameFile = async (req, res, next) => {
  try {
    const ownerId = req.user.userId;
    const { id } = req.params;
    const { name } = req.body;
    const file = await fileService.renameFile({ fileId: id, name, ownerId });
    return res.status(200).json({
      success: true,
      message: 'File renamed successfully.',
      file
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const ownerId = req.user.userId;
    const { id } = req.params;
    const result = await fileService.deleteFile({ fileId: id, ownerId });
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// Dev Fallback Endpoint: Simulated direct S3 upload receiver for local dev without AWS keys
export const mockS3Upload = (req, res) => {
  console.log(`[Mock S3 Bucket] Direct upload PUT received for key: ${req.query.key}`);
  const mockEtag = `"mock_etag_${Date.now()}"`;
  res.setHeader('ETag', mockEtag);
  res.setHeader('Access-Control-Expose-Headers', 'ETag, eTag');
  return res.status(200).send('Mock S3 Upload Successful');
};

// Dev Fallback Endpoint: Simulated direct S3 download sender for local dev without AWS keys
export const mockS3Download = (req, res) => {
  const filename = req.query.name || 'download';
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  return res.send(`Simulated content for file: ${filename}`);
};
