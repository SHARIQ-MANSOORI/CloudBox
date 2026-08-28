import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Folder = sequelize.define('Folder', {
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
    parentFolderId: {
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
    tableName: 'folders',
    timestamps: true
  });

  return Folder;
};
