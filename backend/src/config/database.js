import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cloudbox_db';

export const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export const testDbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to PostgreSQL database:', error.message);
  }
};
