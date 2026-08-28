import { UserKeys, User, FileShare, Folder, File } from '../models/index.js';
import { getEffectiveFolderRole } from './permission.service.js';

export const saveUserKeys = async ({ userId, publicKey, encryptedPrivateKey, encryptedPrivateKeyRecovery, pbkdf2Salt }) => {
  if (!publicKey || !encryptedPrivateKey || !pbkdf2Salt) {
    const error = new Error('Missing required cryptographic key parameters.');
    error.statusCode = 400;
    throw error;
  }

  const [keys, created] = await UserKeys.findOrCreate({
    where: { userId },
    defaults: {
      userId,
      publicKey,
      encryptedPrivateKey,
      encryptedPrivateKeyRecovery,
      pbkdf2Salt
    }
  });

  if (!created) {
    keys.publicKey = publicKey;
    keys.encryptedPrivateKey = encryptedPrivateKey;
    if (encryptedPrivateKeyRecovery) {
      keys.encryptedPrivateKeyRecovery = encryptedPrivateKeyRecovery;
    }
    keys.pbkdf2Salt = pbkdf2Salt;
    await keys.save();
  }

  return keys;
};

export const getUserKeys = async (userId) => {
  const keys = await UserKeys.findOne({ where: { userId } });
  if (!keys) {
    return null;
  }

  return {
    userId: keys.userId,
    publicKey: keys.publicKey,
    encryptedPrivateKey: keys.encryptedPrivateKey,
    pbkdf2Salt: keys.pbkdf2Salt,
    hasRecoveryKey: !!keys.encryptedPrivateKeyRecovery
  };
};

export const getPublicKeyByEmail = async (email) => {
  const user = await User.findOne({
    where: { email },
    include: [{ model: UserKeys, as: 'keys' }]
  });

  if (!user) {
    const error = new Error(`No CloudBox user found with email "${email}".`);
    error.statusCode = 404;
    throw error;
  }

  if (!user.keys) {
    const error = new Error(`User "${email}" has not initialized encryption keys yet.`);
    error.statusCode = 400;
    throw error;
  }

  return {
    userId: user.id,
    email: user.email,
    publicKey: user.keys.publicKey
  };
};

export const getCollaboratorPublicKeysForFolder = async ({ folderId, userId }) => {
  const role = await getEffectiveFolderRole(userId, folderId);
  if (role === 'none') {
    const error = new Error('Access denied to target folder.');
    error.statusCode = 403;
    throw error;
  }

  const folder = await Folder.findByPk(folderId, {
    include: [{ model: User, as: 'owner', include: [{ model: UserKeys, as: 'keys' }] }]
  });

  if (!folder) {
    const error = new Error('Folder not found.');
    error.statusCode = 404;
    throw error;
  }

  const shares = await FileShare.findAll({
    where: { folderId },
    include: [{ model: User, as: 'sharedWithUser', include: [{ model: UserKeys, as: 'keys' }] }]
  });

  const recipients = [];

  // Folder Owner
  if (folder.owner && folder.owner.keys) {
    recipients.push({
      userId: folder.owner.id,
      email: folder.owner.email,
      publicKey: folder.owner.keys.publicKey
    });
  }

  // Collaborators
  for (const s of shares) {
    if (s.sharedWithUser && s.sharedWithUser.keys) {
      if (!recipients.some(r => r.userId === s.sharedWithUser.id)) {
        recipients.push({
          userId: s.sharedWithUser.id,
          email: s.sharedWithUser.email,
          publicKey: s.sharedWithUser.keys.publicKey
        });
      }
    }
  }

  return recipients;
};

export const getRecoveryKeyData = async (email) => {
  const user = await User.findOne({
    where: { email },
    include: [{ model: UserKeys, as: 'keys' }]
  });

  if (!user || !user.keys) {
    const error = new Error('User keys not found for the specified account.');
    error.statusCode = 404;
    throw error;
  }

  return {
    userId: user.id,
    email: user.email,
    pbkdf2Salt: user.keys.pbkdf2Salt,
    encryptedPrivateKeyRecovery: user.keys.encryptedPrivateKeyRecovery,
    publicKey: user.keys.publicKey
  };
};

export const updateKeysFromRecovery = async ({ userId, newEncryptedPrivateKey, newPbkdf2Salt }) => {
  const keys = await UserKeys.findOne({ where: { userId } });
  if (!keys) {
    const error = new Error('User keys not found.');
    error.statusCode = 404;
    throw error;
  }

  keys.encryptedPrivateKey = newEncryptedPrivateKey;
  if (newPbkdf2Salt) {
    keys.pbkdf2Salt = newPbkdf2Salt;
  }
  await keys.save();

  return { message: 'Account private key successfully re-encrypted with new password.' };
};
