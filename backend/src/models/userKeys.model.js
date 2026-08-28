import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const UserKeys = sequelize.define('UserKeys', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    publicKey: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    encryptedPrivateKey: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    encryptedPrivateKeyRecovery: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pbkdf2Salt: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'user_keys',
    timestamps: true
  });

  return UserKeys;
};
