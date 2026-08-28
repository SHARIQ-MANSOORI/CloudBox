export async function up(queryInterface, Sequelize) {
  // Create folders table
  await queryInterface.createTable('folders', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
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
    parentFolderId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'folders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  // Indexes on folders
  await queryInterface.addIndex('folders', ['ownerId']);
  await queryInterface.addIndex('folders', ['parentFolderId']);

  // Create files table
  await queryInterface.createTable('files', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
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
    s3Key: {
      type: Sequelize.STRING,
      allowNull: false
    },
    sizeInBytes: {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 0
    },
    mimeType: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'application/octet-stream'
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  // Indexes on files
  await queryInterface.addIndex('files', ['ownerId']);
  await queryInterface.addIndex('files', ['folderId']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('files');
  await queryInterface.dropTable('folders');
}
