import { app, pool, redis } from '../Constants.js';

/**
 * @api {get} /api/api-call-stats Get osu! API call statistics (last 6 hours, per minute)
 * @apiName api-call-stats
 * @apiGroup Stats
 * @apiSuccess {Array} v1 Array of { minute, calls } for API v1
 * @apiSuccess {Array} v2 Array of { minute, calls } for API v2
 */
app.get('/api/api-call-stats', async (req, res) => {
  try {
    const cacheKey = 'api-call-stats';
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const [v1Result, v2Result] = await Promise.all([
      pool.query(
        `SELECT minute, calls FROM api_calls_v1 WHERE minute >= $1 ORDER BY minute ASC`,
        [cutoff]
      ),
      pool.query(
        `SELECT minute, calls FROM api_calls_v2 WHERE minute >= $1 ORDER BY minute ASC`,
        [cutoff]
      ),
    ]);

    const payload = { v1: v1Result.rows, v2: v2Result.rows };
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', 30);
    res.json(payload);
  } catch (err) {
    console.error('Error fetching api-call-stats:', err);
    res.status(500).json({ error: 'Failed to fetch API call stats' });
  }
});
