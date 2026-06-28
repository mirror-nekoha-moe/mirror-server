export async function migrateAccessLog(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS access_log (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            remote_ip INET,
            method VARCHAR(8) NOT NULL,
            path TEXT NOT NULL,
            query TEXT,

            url TEXT NOT NULL,

            status SMALLINT NOT NULL,

            bytes_sent BIGINT,

            user_agent TEXT,
            referer TEXT,

            http_version VARCHAR(16),

            response_time_ms INTEGER,

            host TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_access_log_created
        ON access_log(created_at);

        CREATE INDEX IF NOT EXISTS idx_access_log_path
        ON access_log(path);

        CREATE INDEX IF NOT EXISTS idx_access_log_ip
        ON access_log(remote_ip);

        CREATE INDEX IF NOT EXISTS idx_access_log_status
        ON access_log(status);    
    `);
    console.log('access_log table is ready');
}
