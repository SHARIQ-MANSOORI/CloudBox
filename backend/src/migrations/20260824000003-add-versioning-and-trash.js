export async function up(queryInterface, Sequelize) {
  // 1. Create file_versions table
  await queryInterface.createTable('file_versions', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    fileId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'files',
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
    versionNumber: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    createdBy: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  await queryInterface.addIndex('file_versions', ['fileId']);

  // 2. Add columns to files table
  await queryInterface.addColumn('files', 'currentVersionId', {
    type: Sequelize.UUID,
    allowNull: true,
    references: {
      model: 'file_versions',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });
  await queryInterface.addColumn('files', 'deletedAt', {
    type: Sequelize.DATE,
    allowNull: true
  });
  await queryInterface.addColumn('files', 'trashExpiresAt', {
    type: Sequelize.DATE,
    allowNull: true
  });

  await queryInterface.addIndex('files', ['deletedAt']);
  await queryInterface.addIndex('files', ['trashExpiresAt']);

  // 3. Add columns to folders table
  await queryInterface.addColumn('folders', 'deletedAt', {
    type: Sequelize.DATE,
    allowNull: true
  });
  await queryInterface.addColumn('folders', 'trashExpiresAt', {
    type: Sequelize.DATE,
    allowNull: true
  });

  await queryInterface.addIndex('folders', ['deletedAt']);
  await queryInterface.addIndex('folders', ['trashExpiresAt']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('folders', 'trashExpiresAt');
  await queryInterface.removeColumn('folders', 'deletedAt');
  await queryInterface.removeColumn('files', 'trashExpiresAt');
  await queryInterface.removeColumn('files', 'deletedAt');
  await queryInterface.removeColumn('files', 'currentVersionId');
  await queryInterface.dropTable('file_versions');
}
