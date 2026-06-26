/**
 * @api {get} /api4/download-stats Get daily download statistics
 * @apiName download-stats
 * @apiGroup Stats
 * @apiQuery {Number} [days=30] Number of past days to return
 * @apiSuccess {Array} rows Array of { day, downloads, bytes_sent }
 */
app.get('/api4/download-stats', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const cacheKey = `download-stats:${days}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const result = await pool.query(`
      SELECT day, downloads, bytes_sent
      FROM download_stats
      WHERE day >= CURRENT_DATE - ($1 || ' days')::interval
      ORDER BY day ASC
    `, [days]);
    await redis.set(cacheKey, JSON.stringify(result.rows), 'EX', process.env.REDIS_CACHE_TIME);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching download-stats:', err);
    res.status(500).json({ error: 'Failed to fetch download stats' });
  }
});
