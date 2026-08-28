import { sequelize } from '../config/database.js';
import createUserModel from './user.model.js';
import createFolderModel from './folder.model.js';
import createFileModel from './file.model.js';
import createUploadSessionModel from './uploadSession.model.js';
import createFileVersionModel from './fileVersion.model.js';
import createFileShareModel from './fileShare.model.js';

import createUserKeysModel from './userKeys.model.js';

export const User = createUserModel(sequelize);
export const Folder = createFolderModel(sequelize);
export const File = createFileModel(sequelize);
export const UploadSession = createUploadSessionModel(sequelize);
export const FileVersion = createFileVersionModel(sequelize);
export const FileShare = createFileShareModel(sequelize);
export const UserKeys = createUserKeysModel(sequelize);

// Model Associations
// User <-> UserKeys
User.hasOne(UserKeys, { foreignKey: 'userId', as: 'keys', onDelete: 'CASCADE' });
UserKeys.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Folder
User.hasMany(Folder, { foreignKey: 'ownerId', as: 'folders', onDelete: 'CASCADE' });
Folder.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// Folder <-> Subfolders (Self-referential)
Folder.hasMany(Folder, { foreignKey: 'parentFolderId', as: 'subfolders', onDelete: 'CASCADE' });
Folder.belongsTo(Folder, { foreignKey: 'parentFolderId', as: 'parentFolder' });

// User <-> File
User.hasMany(File, { foreignKey: 'ownerId', as: 'files', onDelete: 'CASCADE' });
File.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// Folder <-> File
Folder.hasMany(File, { foreignKey: 'folderId', as: 'files', onDelete: 'CASCADE' });
File.belongsTo(Folder, { foreignKey: 'folderId', as: 'folder' });

// User & File <-> UploadSession
User.hasMany(UploadSession, { foreignKey: 'userId', as: 'uploadSessions', onDelete: 'CASCADE' });
UploadSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

File.hasMany(UploadSession, { foreignKey: 'fileId', as: 'uploadSessions', onDelete: 'CASCADE' });
UploadSession.belongsTo(File, { foreignKey: 'fileId', as: 'file' });

// File <-> FileVersion
File.hasMany(FileVersion, { foreignKey: 'fileId', as: 'versions', onDelete: 'CASCADE' });
FileVersion.belongsTo(File, { foreignKey: 'fileId', as: 'file' });

File.belongsTo(FileVersion, { foreignKey: 'currentVersionId', as: 'currentVersion' });
FileVersion.belongsTo(User, { foreignKey: 'createdBy', as: 'uploader' });

// FileShare Associations
User.hasMany(FileShare, { foreignKey: 'ownerId', as: 'sharedItems', onDelete: 'CASCADE' });
User.hasMany(FileShare, { foreignKey: 'sharedWithUserId', as: 'receivedShares', onDelete: 'CASCADE' });
FileShare.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
FileShare.belongsTo(User, { foreignKey: 'sharedWithUserId', as: 'sharedWithUser' });

File.hasMany(FileShare, { foreignKey: 'fileId', as: 'shares', onDelete: 'CASCADE' });
FileShare.belongsTo(File, { foreignKey: 'fileId', as: 'file' });

Folder.hasMany(FileShare, { foreignKey: 'folderId', as: 'shares', onDelete: 'CASCADE' });
FileShare.belongsTo(Folder, { foreignKey: 'folderId', as: 'folder' });

const db = {
  sequelize,
  User,
  Folder,
  File,
  UploadSession,
  FileVersion,
  FileShare,
  UserKeys
};

export default db;
