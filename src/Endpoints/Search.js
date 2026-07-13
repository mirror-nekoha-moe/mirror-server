import { app, pool, redis } from '../Constants.js';
/**
 * @api {get} /api/search Search beatmapsets
 * @apiName search
 * @apiGroup Beatmapset
 * @apiDescription Full beatmapset search with text, status, mode, difficulty, and metadata filters. Returns 100 results per page with embedded beatmaps array. Cached in Redis.
 * @apiParam {String}  [q]           Free-text search across title, artist, creator, tags, source
 * @apiParam {Number}  [page=1]      Page number (100 results per page)
 * @apiParam {String}  [sort]        Sort field: id, title, artist, creator, bpm, updated, ranked, submitted, favourites, difficulty
 * @apiParam {String}  [order=desc]  Sort direction: asc / desc
 * @apiParam {String}  [status]      Comma-separated status filter: ranked, approved, loved, qualified, pending, wip, graveyard
 * @apiParam {String}  [mode]        Comma-separated mode filter: osu, taiko, fruits, mania
 * @apiParam {Number}  [id]          Exact beatmapset ID lookup
 * @apiParam {Number}  [map_id]      Exact beatmap (difficulty) ID lookup
 * @apiParam {Number}  [stars_min]   Min difficulty rating (per-diff filter)
 * @apiParam {Number}  [stars_max]   Max difficulty rating (per-diff filter)
 * @apiParam {Number}  [ar_min]      Min approach rate
 * @apiParam {Number}  [ar_max]      Max approach rate
 * @apiParam {Number}  [cs_min]      Min circle size
 * @apiParam {Number}  [cs_max]      Max circle size
 * @apiParam {Number}  [od_min]      Min overall difficulty
 * @apiParam {Number}  [od_max]      Max overall difficulty
 * @apiParam {Number}  [hp_min]      Min drain rate
 * @apiParam {Number}  [hp_max]      Max drain rate
 * @apiParam {Number}  [bpm_min]     Min BPM (beatmapset level)
 * @apiParam {Number}  [bpm_max]     Max BPM (beatmapset level)
 * @apiParam {Number}  [length_min]  Min total length in seconds
 * @apiParam {Number}  [length_max]  Max total length in seconds
 * @apiParam {String}  [video]       Filter by video presence: "true" = has video, "false" = no video
 * @apiSuccess {Object[]} beatmapsets List of beatmapsets, each with a nested beatmaps array
 * @apiError 500 Internal server error
 * @apiExample {curl} Basic search:
 *     curl "https://mirror.nekoha.moe/api/search?q=camellia&status=ranked&page=1"
 * @apiExample {curl} With video filter:
 *     curl "https://mirror.nekoha.moe/api/search?video=true&status=ranked"
 */
app.get('/api/search', async (req, res) => {
  try {
    const queryParams = { ...req.query };
    const sortedKeys = Object.keys(queryParams).sort();
    const keyParts = sortedKeys.map(k => `${k}=${queryParams[k]}`);
    const cacheKey = `search:${keyParts.join('&')}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const {
      q, sort, order = 'desc', page = 1,
      status, mode,
      stars_min, stars_max,
      ar_min, ar_max,
      cs_min, cs_max,
      od_min, od_max,
      hp_min, hp_max,
      bpm_min, bpm_max,
      length_min, length_max,
      id: beatmapsetId, map_id,
      video,
    } = req.query;

    const where = [`downloaded = true`];
    const values = [];
    let idx = 1;

    // Text search
    if (q) {
      where.push(`(title ILIKE $${idx} OR artist ILIKE $${idx} OR creator ILIKE $${idx} OR tags ILIKE $${idx} OR source ILIKE $${idx})`);
      values.push(`%${q}%`); idx++;
    }

    // Exact beatmapset ID
    if (beatmapsetId) {
      const bid = parseInt(beatmapsetId, 10);
      if (!isNaN(bid)) { where.push(`id = $${idx}`); values.push(bid); idx++; }
    }

    // Status filter (comma separated: ranked,approved,loved,pending,graveyard,wip,qualified)
    if (status) {
      const validStatuses = ['ranked', 'approved', 'loved', 'pending', 'graveyard', 'wip', 'qualified'];
      const statuses = status.split(',').map(s => s.trim().toLowerCase()).filter(s => validStatuses.includes(s));
      if (statuses.length) {
        where.push(`status = ANY($${idx})`);
        values.push(statuses); idx++;
      }
    }

    // Mode filter (comma separated: osu,taiko,fruits,mania)
    if (mode) {
      const modeColMap = { osu: 'mode_osu_count', taiko: 'mode_taiko_count', fruits: 'mode_fruits_count', catch: 'mode_fruits_count', mania: 'mode_mania_count' };
      const modes = mode.split(',').map(m => m.trim().toLowerCase());
      const modeClauses = [...new Set(modes.map(m => modeColMap[m]).filter(Boolean))].map(col => `${col} > 0`);
      if (modeClauses.length) where.push(`(${modeClauses.join(' OR ')})`);
    }

    // Video filter
    if (video === 'true')  { where.push(`video = true`); }
    if (video === 'false') { where.push(`(video = false OR video IS NULL)`); }

    // BPM range (beatmapset level)
    if (bpm_min !== undefined && bpm_min !== '') { const v = parseFloat(bpm_min); if (!isNaN(v)) { where.push(`bpm >= $${idx}`); values.push(v); idx++; } }
    if (bpm_max !== undefined && bpm_max !== '') { const v = parseFloat(bpm_max); if (!isNaN(v)) { where.push(`bpm <= $${idx}`); values.push(v); idx++; } }

    // Per-difficulty filters via EXISTS subquery on beatmap_metadata
    const bmFilters = [];
    const tryBmFilter = (col, val, op) => {
      if (val === undefined || val === '') return;
      const f = parseFloat(val);
      if (!isNaN(f)) { bmFilters.push(`bm.${col} ${op} $${idx}`); values.push(f); idx++; }
    };
    tryBmFilter('difficulty_rating', stars_min, '>=');
    tryBmFilter('difficulty_rating', stars_max, '<=');
    tryBmFilter('ar',       ar_min, '>='); tryBmFilter('ar',       ar_max, '<=');
    tryBmFilter('cs',       cs_min, '>='); tryBmFilter('cs',       cs_max, '<=');
    tryBmFilter('accuracy', od_min, '>='); tryBmFilter('accuracy', od_max, '<=');
    tryBmFilter('drain',    hp_min, '>='); tryBmFilter('drain',    hp_max, '<=');
    tryBmFilter('total_length', length_min, '>='); tryBmFilter('total_length', length_max, '<=');

    // Exact beatmap ID
    if (map_id) {
      const mid = parseInt(map_id, 10);
      if (!isNaN(mid)) { bmFilters.push(`bm.id = $${idx}`); values.push(mid); idx++; }
    }

    if (bmFilters.length) {
      where.push(`EXISTS (SELECT 1 FROM ${process.env.TABLE_BEATMAP} bm WHERE bm.beatmapset_id = ${process.env.TABLE_BEATMAPSET}.id AND ${bmFilters.join(' AND ')})`);
    }

    // Sort
    const allowedSortFields = {
      id: 'id', title: 'title', artist: 'artist', creator: 'creator',
      bpm: 'bpm', updated: 'last_updated', ranked: 'ranked_date',
      submitted: 'submitted_date', favourites: 'favourite_count',
      difficulty: 'beatmap_count',
    };
    const sortCol = allowedSortFields[sort] || 'last_updated';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = 100;
    const offset = (pageNum - 1) * limit;

    let baseQuery = `SELECT * FROM ${process.env.TABLE_BEATMAPSET}`;
    if (where.length) baseQuery += ' WHERE ' + where.join(' AND ');
    const query = `${baseQuery} ORDER BY ${sortCol} ${sortDir} LIMIT ${limit} OFFSET ${offset}`;

    const result = await pool.query(query, values);
    let rows = result.rows;

    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      const bmRes = await pool.query(`SELECT * FROM ${process.env.TABLE_BEATMAP} WHERE beatmapset_id = ANY($1)`, [ids]);
      const bmMap = {};
      for (const bm of bmRes.rows) {
        if (!bmMap[bm.beatmapset_id]) bmMap[bm.beatmapset_id] = [];
        bmMap[bm.beatmapset_id].push(bm);
      }
      rows = rows.map(r => ({ ...r, beatmaps: bmMap[r.id] || [] }));
    }

    await redis.set(cacheKey, JSON.stringify(rows), 'EX', process.env.REDIS_CACHE_TIME);
    res.json(rows);
  } catch (err) {
    console.error('Error in beatmapset search:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to search beatmapsets' });
  }
});
