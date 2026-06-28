export async function migrateRequestItem(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS request_item (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

            batch_id BIGINT NOT NULL,

            type VARCHAR(32),
            beatmapset_id VARCHAR(32),
            beatmapset_url TEXT,
            osz_url TEXT,
            notes TEXT,

            CONSTRAINT fk_request_batch
                FOREIGN KEY (batch_id)
                REFERENCES request_batch(id)
                ON DELETE CASCADE
        );
    `);    
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_request_item_batch_id
        ON request_item(batch_id);
    `);
    console.log('request_item table is ready');
}
