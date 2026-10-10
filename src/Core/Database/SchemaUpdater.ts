import { Database } from '@Core/Database/Connection';

export class SchemaUpdater {
    static async initialize(): Promise<void> {
        await SchemaUpdater.createDownloadStats();
        await SchemaUpdater.createApiRequestStats();
        await SchemaUpdater.createRequestBatch();
        await SchemaUpdater.createRequestItem();
        await SchemaUpdater.createApiKeys();
        console.log('Database tables are ready');
    }

    private static async createDownloadStats(): Promise<void> {
        await Database.query(`
            CREATE TABLE IF NOT EXISTS download_stats (
                day DATE PRIMARY KEY DEFAULT CURRENT_DATE,
                downloads BIGINT NOT NULL DEFAULT 0,
                bytes_sent BIGINT NOT NULL DEFAULT 0
            );
        `);
        console.log('download_stats table is ready');
    }

    private static async createApiRequestStats(): Promise<void> {
        await Database.query(`
            CREATE TABLE IF NOT EXISTS api_request_stats (
                day DATE PRIMARY KEY DEFAULT CURRENT_DATE,
                requests BIGINT NOT NULL DEFAULT 0,
                bytes_sent BIGINT NOT NULL DEFAULT 0
            );
        `);
        // table existed before bytes_sent was added
        await Database.query(`
            ALTER TABLE api_request_stats
            ADD COLUMN IF NOT EXISTS bytes_sent BIGINT NOT NULL DEFAULT 0;
        `);
        console.log('api_request_stats table is ready');
    }

    private static async createRequestBatch(): Promise<void> {
        await Database.query(`
            CREATE TABLE IF NOT EXISTS request_batch (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                status VARCHAR(32) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('request_batch table is ready');
    }

    private static async createRequestItem(): Promise<void> {
        await Database.query(`
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
        await Database.query(`
            CREATE INDEX IF NOT EXISTS idx_request_item_batch_id
            ON request_item(batch_id);
        `);
        console.log('request_item table is ready');
    }

    private static async createApiKeys(): Promise<void> {
        await Database.query(`
            CREATE TABLE IF NOT EXISTS api_keys (
                api_key TEXT
                ,discord_uid TEXT
                ,osu_uid BIGINT
            );
        `);
        console.log('api_keys table is ready');
    }
}