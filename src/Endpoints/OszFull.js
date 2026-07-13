import { app, pool, redis } from '../Constants.js';
/**
 * @api {get} /api/oszFull Get all beatmapset .osz file sizes
 * @apiName oszFull
 * @apiGroup Beatmapset
 * @apiDescription Returns id + file_size for every beatmapset in the database.
 * @apiSuccess {Object[]} beatmapsets List of beatmapsets
 * @apiSuccess {Number} beatmapsets.id Beatmapset ID
 * @apiSuccess {Number} beatmapsets.file_size Size of the .osz file in bytes
 * @apiError 404 No beatmapsets found
 * @apiError 500 Internal server error
 * @apiExample {curl} Example usage:
 *     curl https://mirror.nekoha.moe/api/oszFull
 */
app.get('/api/oszFull', async (req, res) => {
  try {
    const cacheKey = `oszFull`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      res.setHeader('Content-Type', 'application/json');
      return res.end(cached);
    }

    const result = await pool.query(
      `SELECT id, file_size FROM ${process.env.TABLE_BEATMAPSET}`
    );

    if (result.rows.length > 0) {
      const payload = JSON.stringify(result.rows);
      await redis.set(cacheKey, payload, 'EX', process.env.REDIS_CACHE_TIME);
      res.setHeader('Content-Type', 'application/json');
      return res.end(payload);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.status(404).json({ error: 'No beatmapsets found (report this error)' });
    }
  } catch (err) {
    console.error('Error fetching beatmapset:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch beatmapset' });
  }
});