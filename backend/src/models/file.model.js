import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const File = sequelize.define('File', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    folderId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    s3Key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sizeInBytes: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'application/octet-stream'
    },
    currentVersionId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    trashExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'files',
    timestamps: true
  });

  return File;
};
