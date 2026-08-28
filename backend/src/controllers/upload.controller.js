import * as uploadService from '../services/upload.service.js';

export const initUpload = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { filename, mimeType, totalSize, folderId, wrappedKey, iv } = req.body;
    const result = await uploadService.initUpload({ filename, mimeType, totalSize, folderId, userId, wrappedKey, iv });
    return res.status(201).json({
      success: true,
      message: 'Multipart upload session initialized.',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const getPartUrl = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.params;
    const { partNumber } = req.body;
    const result = await uploadService.getPartUrl({ sessionId, partNumber, userId });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const completePart = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.params;
    const { partNumber, eTag } = req.body;
    const result = await uploadService.completePart({ sessionId, partNumber, eTag, userId });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const completeUpload = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.params;
    const result = await uploadService.completeUpload({ sessionId, userId });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const getSessionStatus = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.params;
    const result = await uploadService.getSessionStatus({ sessionId, userId });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const abortUpload = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.params;
    const result = await uploadService.abortUpload({ sessionId, userId });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};
