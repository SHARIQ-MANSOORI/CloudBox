import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const FileVersion = sequelize.define('FileVersion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fileId: {
      type: DataTypes.UUID,
      allowNull: false
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
    versionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    createdBy: {
      type: DataTypes.UUID,
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
    tableName: 'file_versions',
    timestamps: true,
    updatedAt: false // Only createdAt is needed for immutable versions
  });

  return FileVersion;
};
