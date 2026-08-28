export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('upload_sessions', {
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
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    s3UploadId: {
      type: Sequelize.STRING,
      allowNull: false
    },
    s3Key: {
      type: Sequelize.STRING,
      allowNull: false
    },
    totalChunks: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    completedParts: {
      type: Sequelize.JSONB,
      defaultValue: [],
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('in-progress', 'completed', 'aborted'),
      defaultValue: 'in-progress',
      allowNull: false
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

  await queryInterface.addIndex('upload_sessions', ['userId']);
  await queryInterface.addIndex('upload_sessions', ['fileId']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('upload_sessions');
}
