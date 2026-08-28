import { getFileVersions, restoreFileVersion } from '../services/version.service.js';

export const listVersions = async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const ownerId = req.user.id;

    const data = await getFileVersions({ fileId, ownerId });
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

export const restoreVersion = async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const versionId = req.params.versionId;
    const ownerId = req.user.id;

    const result = await restoreFileVersion({ fileId, versionId, ownerId });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
