import { migrateDownloadStats } from './Tables/download_stats.js';
import { migrateRequestBatch } from './Tables/request_batch.js';
import { migrateRequestItem } from './Tables/request_item.js';
import { migrateAccessLog } from './Tables/access_log.js';

export async function runMigrations(pool) {
    await migrateDownloadStats(pool);
    await migrateRequestBatch(pool);
    await migrateRequestItem(pool);
    await migrateAccessLog(pool);
    console.log('Database tables are ready');
}