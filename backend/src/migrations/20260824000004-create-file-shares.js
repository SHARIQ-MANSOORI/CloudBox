export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('file_shares', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    fileId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'files',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    folderId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'folders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    ownerId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    sharedWithUserId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    role: {
      type: Sequelize.ENUM('viewer', 'editor'),
      allowNull: false,
      defaultValue: 'viewer'
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  // Unique index on (fileId, sharedWithUserId) where fileId is not null
  await queryInterface.addIndex('file_shares', ['fileId', 'sharedWithUserId'], {
    unique: true,
    name: 'unique_file_share_per_user'
  });

  // Unique index on (folderId, sharedWithUserId) where folderId is not null
  await queryInterface.addIndex('file_shares', ['folderId', 'sharedWithUserId'], {
    unique: true,
    name: 'unique_folder_share_per_user'
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('file_shares');
}
