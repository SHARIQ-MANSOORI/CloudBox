import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const UploadSession = sequelize.define('UploadSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fileId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    s3UploadId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    s3Key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    totalChunks: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    completedParts: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('in-progress', 'completed', 'aborted'),
      defaultValue: 'in-progress',
      allowNull: false
    },
    wrappedKey: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    iv: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'upload_sessions',
    timestamps: true
  });

  return UploadSession;
};
