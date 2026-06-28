export async function migrateRequestBatch(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS request_batch (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            status VARCHAR(32) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
    console.log('request_batch table is ready');
}
