/**
 * @api {get} /api4/osz/:id Get .osz file size for a beatmapset
 * @apiName osz
 * @apiGroup Beatmapset
 * @apiDescription Returns the stored file size (in bytes) of a beatmapset's .osz archive.
 * @apiParam {Number} id Beatmapset ID
 * @apiSuccess {Number} id Beatmapset ID
 * @apiSuccess {Number} file_size Size of the .osz file in bytes
 * @apiError 400 Invalid beatmapset ID (must be a positive number)
 * @apiError 404 Beatmapset not found
 * @apiError 500 Internal server error
 * @apiExample {curl} Example usage:
 *     curl https://mirror.nekoha.moe/api4/osz/12345
 */
app.get('/api4/osz/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `osz:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId < 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'Invalid beatmapset ID. Must be a positive number.' });
    }
    const result = await pool.query(
      `SELECT id, file_size FROM ${process.env.TABLE_BEATMAPSET} WHERE id = $1`,
      [numericId]
    );
    if (result.rows.length > 0) {
      await redis.set(cacheKey, JSON.stringify(result.rows[0]), 'EX', process.env.REDIS_CACHE_TIME);
      res.json(result.rows[0]);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.status(404).json({ error: 'Beatmapset not found' });
    }
  } catch (err) {
    console.error('Error fetching beatmapset:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch beatmapset' });
  }
});

