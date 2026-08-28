import app from './src/app.js';
import { sequelize, testDbConnection } from './src/config/database.js';
import { initCronJobs } from './src/config/cron.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  await testDbConnection();

  // Initialize node-cron daily cleanup schedule
  initCronJobs();

  try {
    // Sync models in development mode (creates tables if missing)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      console.log('[Sequelize] Database synchronized successfully.');
    }
  } catch (error) {
    console.warn('[Sequelize Warning] Database sync failed (PostgreSQL might be offline):', error.message);
  }

  app.listen(PORT, () => {
    console.log(`\n--------------------------------------------------`);
    console.log(`  CloudBox Backend Server running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    console.log(`--------------------------------------------------\n`);
  });
}

startServer();
