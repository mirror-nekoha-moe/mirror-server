/**
 * @api {get} /api4/stats Get beatmap mirror statistics
 * @apiName stats
 * @apiGroup Stats
 * @apiDescription Returns stats table row.
 * @apiSuccess {Number} beatmapset_count Total number of beatmapsets stored
 * @apiSuccess {Number} beatmap_count Total number of individual beatmaps
 * @apiSuccess {Number} total_size Total storage size in bytes
 * @apiError 404 No stats found
 * @apiError 500 Internal server error
 * @apiExample {curl} Example usage:
 *     curl https://mirror.nekoha.moe/api4/stats
 */
app.get('/api4/stats', async (req, res) => {
    try {
        // Try cache first
        const cacheKey = 'stats';
        const cached = await redis.get(cacheKey);

        if (cached) {
            return res.json(JSON.parse(cached));
        }

        // Not cached, query Postgres
        const result = await pool.query(`SELECT * FROM ${process.env.TABLE_STATS}`);

        if (result.rows.length === 0) {
            const empty = [];
            await redis.set(cacheKey, JSON.stringify(empty), 'EX', process.env.REDIS_CACHE_TIME);
            return res.json(empty);
        }

        const stats = result.rows[0];
        await redis.set(cacheKey, JSON.stringify(stats), 'EX', process.env.REDIS_CACHE_TIME);
        res.json(stats);
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
