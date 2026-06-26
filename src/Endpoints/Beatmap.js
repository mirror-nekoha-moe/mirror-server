/**
 * @api {get} /api4/beatmap/:id Get beatmap metadata
 * @apiName beatmap
 * @apiGroup Beatmap
 * @apiDescription Returns full metadata for a single beatmap (difficulty). Cached in Redis.
 * @apiParam {Number} id Beatmap ID
 * @apiSuccess {Number}  id                 Beatmap ID
 * @apiSuccess {Number}  beatmapset_id      Parent beatmapset ID
 * @apiSuccess {String}  version            Difficulty name
 * @apiSuccess {String}  mode               Game mode (osu/taiko/fruits/mania)
 * @apiSuccess {Number}  difficulty_rating  Star rating
 * @apiSuccess {Number}  ar                 Approach rate
 * @apiSuccess {Number}  cs                 Circle size
 * @apiSuccess {Number}  accuracy           Overall difficulty (OD)
 * @apiSuccess {Number}  drain              HP drain rate
 * @apiSuccess {Number}  bpm                BPM
 * @apiSuccess {Number}  total_length       Total length in seconds
 * @apiSuccess {Number}  hit_length         Drain length in seconds
 * @apiSuccess {Number}  count_circles      Hit circle count
 * @apiSuccess {Number}  count_sliders      Slider count
 * @apiSuccess {Number}  count_spinners     Spinner count
 * @apiSuccess {Number}  playcount          Play count for this difficulty
 * @apiSuccess {Number}  passcount          Pass count for this difficulty
 * @apiSuccess {String}  status             Ranked status
 * @apiSuccess {Boolean} is_scoreable       Whether scores can be submitted
 * @apiSuccess {Boolean} convert            Whether this is a converted difficulty
 * @apiSuccess {String}  checksum           MD5 checksum of the .osu file
 * @apiSuccess {String}  last_updated       ISO date of last update
 * @apiSuccess {String}  deleted_at         ISO date when deleted (null if not deleted)
 * @apiError 400 Invalid beatmap ID (must be a positive number)
 * @apiError 404 Beatmap not found
 * @apiError 500 Internal server error
 * @apiExample {curl} Example usage:
 *     curl https://mirror.nekoha.moe/api4/beatmap/123456
 */
app.get('/api4/beatmap/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `beatmap:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId < 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'Invalid beatmap ID. Must be a positive number.' });
    }
    const result = await pool.query(
      `SELECT * FROM ${process.env.TABLE_BEATMAP} WHERE id = $1`,
      [numericId]
    );
    if (result.rows.length > 0) {
      await redis.set(cacheKey, JSON.stringify(result.rows[0]), 'EX', process.env.REDIS_CACHE_TIME);
      res.json(result.rows[0]);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.status(404).json({ error: 'Beatmap not found' });
    }
  } catch (err) {
    console.error('Error fetching beatmap:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch beatmap' });
  }
});

