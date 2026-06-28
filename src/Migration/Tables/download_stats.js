export async function migrateDownloadStats(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS download_stats (
            day DATE PRIMARY KEY DEFAULT CURRENT_DATE,
            downloads BIGINT NOT NULL DEFAULT 0,
            bytes_sent BIGINT NOT NULL DEFAULT 0
        );
    `);
    console.log('download_stats table is ready');
}
