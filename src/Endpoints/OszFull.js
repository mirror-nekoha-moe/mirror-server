/**
 * @api {get} /api4/oszFull Get all beatmapset .osz file sizes
 * @apiName oszFull
 * @apiGroup Beatmapset
 * @apiDescription Returns id + file_size for every beatmapset in the database.
 * @apiSuccess {Object[]} beatmapsets List of beatmapsets
 * @apiSuccess {Number} beatmapsets.id Beatmapset ID
 * @apiSuccess {Number} beatmapsets.file_size Size of the .osz file in bytes
 * @apiError 404 No beatmapsets found
 * @apiError 500 Internal server error
 * @apiExample {curl} Example usage:
 *     curl https://mirror.nekoha.moe/api4/oszFull
 */
app.get('/api4/oszFull', async (req, res) => {
  try {
    const cacheKey = `oszFull`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const result = await pool.query(
      `SELECT id, file_size FROM ${process.env.TABLE_BEATMAPSET}`
    );
    if (result.rows.length > 0) {
      await redis.set(cacheKey, JSON.stringify(result.rows), 'EX', process.env.REDIS_CACHE_TIME);
      res.json(result.rows);
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