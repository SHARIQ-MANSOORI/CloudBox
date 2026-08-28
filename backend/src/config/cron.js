import cron from 'node-cron';
import { purgeExpiredTrash } from '../services/trash.service.js';

export const initCronJobs = () => {
  // Schedule daily trash purge job at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron Job] Starting daily scheduled trash purge...');
    try {
      await purgeExpiredTrash();
    } catch (err) {
      console.error('[Cron Job Error] Failed to execute trash purge:', err.message);
    }
  });

  console.log('[Cron Config] Daily trash cleanup job scheduled (00:00).');
};
