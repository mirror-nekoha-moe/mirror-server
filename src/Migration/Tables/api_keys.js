export async function migrateApiKeys(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
            api_key TEXT
            discord_uid TEXT
            osu_uid BIGINT
        );
    `);
    console.log('api_keys table is ready');
}
