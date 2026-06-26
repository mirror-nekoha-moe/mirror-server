import { app, pool, redis } from '../Constants.js';

/**
 * @api {get} /api4/beatmapsetFull/:id Get full beatmapset info (with beatmaps array)
 * @apiName beatmapsetFull
 * @apiGroup Beatmapset
 * @apiDescription Same as /api4/beatmapset/:id but also includes a nested beatmaps array sorted by difficulty_rating ASC. Cached in Redis.
 * @apiParam {Number} id Beatmapset ID
 * @apiSuccess {Object}   beatmapset                            Full beatmapset metadata (all fields from /beatmapset/:id)
 * @apiSuccess {Object[]} beatmapset.beatmaps                   Array of beatmaps sorted by difficulty_rating ASC
 * @apiSuccess {Number}   beatmapset.beatmaps.id                Beatmap ID
 * @apiSuccess {String}   beatmapset.beatmaps.version           Difficulty name
 * @apiSuccess {String}   beatmapset.beatmaps.mode              Game mode (osu/taiko/fruits/mania)
 * @apiSuccess {Number}   beatmapset.beatmaps.difficulty_rating Star rating
 * @apiSuccess {Number}   beatmapset.beatmaps.ar                Approach rate
 * @apiSuccess {Number}   beatmapset.beatmaps.cs                Circle size
 * @apiSuccess {Number}   beatmapset.beatmaps.accuracy          Overall difficulty
 * @apiSuccess {Number}   beatmapset.beatmaps.drain             HP drain rate
 * @apiSuccess {Number}   beatmapset.beatmaps.bpm               BPM
 * @apiSuccess {Number}   beatmapset.beatmaps.total_length      Total length in seconds
 * @apiSuccess {Number}   beatmapset.beatmaps.hit_length        Drain length in seconds
 * @apiSuccess {String}   beatmapset.beatmaps.status            Ranked status
 * @apiSuccess {String}   beatmapset.beatmaps.checksum          MD5 checksum of the .osu file
 * @apiError 400 Invalid beatmapset ID (must be a positive number)
 * @apiError 404 Beatmapset not found
 * @apiError 500 Internal server error
 * @apiExample {curl} Example usage:
 *     curl https://mirror.nekoha.moe/api4/beatmapsetFull/12345
 */
app.get('/api4/beatmapsetFull/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `beatmapsetFull:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId < 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'Invalid beatmapset ID. Must be a positive number.' });
    }
    // Get beatmapset data
    const beatmapsetResult = await pool.query(
      `SELECT * FROM ${process.env.TABLE_BEATMAPSET} WHERE id = $1`,
      [numericId]
    );
    if (beatmapsetResult.rows.length === 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'Beatmapset not found' });
    }
    // Get all beatmaps for this beatmapset
    const beatmapsResult = await pool.query(
      `SELECT * FROM ${process.env.TABLE_BEATMAP} WHERE beatmapset_id = $1 ORDER BY difficulty_rating ASC`,
      [numericId]
    );
    // Combine data
    const fullData = {
      ...beatmapsetResult.rows[0],
      beatmaps: beatmapsResult.rows
    };
    await redis.set(cacheKey, JSON.stringify(fullData), 'EX', process.env.REDIS_CACHE_TIME);
    res.json(fullData);
  } catch (err) {
    console.error('Error fetching full beatmapset:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch full beatmapset' });
  }
});
