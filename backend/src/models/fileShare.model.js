import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const FileShare = sequelize.define('FileShare', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fileId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    folderId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    sharedWithUserId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('viewer', 'editor'),
      allowNull: false,
      defaultValue: 'viewer'
    },
    wrappedKeyForUser: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'file_shares',
    timestamps: true,
    updatedAt: false, // Only createdAt is needed
    validate: {
      oneTargetOnly() {
        if ((!this.fileId && !this.folderId) || (this.fileId && this.folderId)) {
          throw new Error('FileShare must target either a fileId or a folderId, but not both or neither.');
        }
      }
    }
  });

  return FileShare;
};
