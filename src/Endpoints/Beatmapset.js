/**
 * @api {get} /api4/beatmapset/:id Get beatmapset metadata
 * @apiName beatmapset
 * @apiGroup Beatmapset
 * @apiDescription Returns full metadata for a single beatmapset. Does not include the beatmaps array, use beatmapsetFull for that. Cached in Redis.
 * @apiParam {Number} id Beatmapset ID
 * @apiSuccess {Number}  id                 Beatmapset ID
 * @apiSuccess {String}  title              Song title
 * @apiSuccess {String}  artist             Song artist
 * @apiSuccess {String}  creator            Mapper username
 * @apiSuccess {Number}  user_id            Mapper user ID
 * @apiSuccess {String}  status             Ranked status (ranked/approved/loved/qualified/pending/wip/graveyard)
 * @apiSuccess {Number}  bpm                BPM
 * @apiSuccess {Boolean} video              Whether the beatmapset includes a video
 * @apiSuccess {Boolean} storyboard         Whether the beatmapset includes a storyboard
 * @apiSuccess {Boolean} nsfw               Whether the beatmapset is marked NSFW
 * @apiSuccess {Number}  favourite_count    Number of favourites
 * @apiSuccess {Number}  play_count         Total play count
 * @apiSuccess {Number}  file_size          .osz file size in bytes
 * @apiSuccess {String}  preview_url        Audio preview URL (protocol-relative, e.g. //b.ppy.sh/preview/12345.mp3)
 * @apiSuccess {String}  tags               Space-separated tags
 * @apiSuccess {String}  source             Song source
 * @apiSuccess {Number}  genre_id           Genre ID
 * @apiSuccess {Number}  language_id        Language ID
 * @apiSuccess {String}  submitted_date     ISO date when the beatmapset was submitted
 * @apiSuccess {String}  ranked_date        ISO date when the beatmapset was ranked (null if not ranked)
 * @apiSuccess {String}  last_updated       ISO date of last update
 * @apiSuccess {Boolean} downloaded         Whether the .osz file has been downloaded to the mirror
 * @apiSuccess {Boolean} missing_audio      Whether the file is unavailable due to missing audio
 * @apiSuccess {Boolean} dmca               Whether the file is unavailable due to DMCA
 * @apiError 400 Invalid beatmapset ID (must be a positive number)
 * @apiError 404 Beatmapset not found
 * @apiError 500 Internal server error
 * @apiExample {curl} Example usage:
 *     curl https://mirror.nekoha.moe/api4/beatmapset/12345
 */
app.get('/api4/beatmapset/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `beatmapset:${id}`;
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
      `SELECT * FROM ${process.env.TABLE_BEATMAPSET} WHERE id = $1`,
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

