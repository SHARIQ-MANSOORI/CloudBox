export async function up(queryInterface, Sequelize) {
  // 1. Create user_keys table
  await queryInterface.createTable('user_keys', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    publicKey: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    encryptedPrivateKey: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    encryptedPrivateKeyRecovery: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    pbkdf2Salt: {
      type: Sequelize.STRING,
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

  // 2. Add wrappedKey & iv to file_versions
  await queryInterface.addColumn('file_versions', 'wrappedKey', {
    type: Sequelize.TEXT,
    allowNull: true
  });
  await queryInterface.addColumn('file_versions', 'iv', {
    type: Sequelize.STRING,
    allowNull: true
  });

  // 3. Add wrappedKey & iv to upload_sessions
  await queryInterface.addColumn('upload_sessions', 'wrappedKey', {
    type: Sequelize.TEXT,
    allowNull: true
  });
  await queryInterface.addColumn('upload_sessions', 'iv', {
    type: Sequelize.STRING,
    allowNull: true
  });

  // 4. Add wrappedKeyForUser to file_shares
  await queryInterface.addColumn('file_shares', 'wrappedKeyForUser', {
    type: Sequelize.TEXT,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('file_shares', 'wrappedKeyForUser');
  await queryInterface.removeColumn('upload_sessions', 'iv');
  await queryInterface.removeColumn('upload_sessions', 'wrappedKey');
  await queryInterface.removeColumn('file_versions', 'iv');
  await queryInterface.removeColumn('file_versions', 'wrappedKey');
  await queryInterface.dropTable('user_keys');
}
