import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';

const require = createRequire(import.meta.url);
const yauzl = require('yauzl');
const { ZipArchive } = require('archiver');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT;

const redis = new Redis({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT });

// Database connection
const pool = new pg.Pool({
  host: process.env.PG_HOSTNAME,
  user: process.env.PG_USERNAME,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

// Ensure download_stats table exists
await pool.query(`
  CREATE TABLE IF NOT EXISTS download_stats (
    day         DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    downloads   BIGINT NOT NULL DEFAULT 0,
    bytes_sent  BIGINT NOT NULL DEFAULT 0
  )
`);
console.log('download_stats table ready');

// Middleware
app.use(cors());
app.use(express.json());

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


/**
 * @api {get} /api4/search Search beatmapsets
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
 *     curl "https://mirror.nekoha.moe/api4/search?q=camellia&status=ranked&page=1"
 * @apiExample {curl} With video filter:
 *     curl "https://mirror.nekoha.moe/api4/search?video=true&status=ranked"
 */
app.get('/api4/search', async (req, res) => {
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


/**
 * @api {get} /api4/download/:id Download a beatmapset (.osz file)
 * @apiName download
 * @apiGroup File
 * @apiDescription Streams the .osz archive for the given beatmapset. If the beatmapset has a video and noVideo=1 is passed, the video files are stripped on-the-fly via zip repacking (yauzl + archiver). If the beatmapset has no video, the noVideo param is ignored and the file is streamed directly.
 * @apiParam {Number} id Beatmapset ID
 * @apiQuery {String} [noVideo=0] Pass noVideo=1 to strip video files from the .osz (only applied when the beatmapset actually has a video)
 * @apiSuccess {File} .osz The beatmapset archive file (application/x-osu-beatmap-archive)
 * @apiError 400 Invalid beatmapset ID (must be a positive number)
 * @apiError 404 Beatmapset not found (not yet downloaded), or folder/.osz is missing
 * @apiError 410 Beatmapset unavailable (missing audio/DMCA takedown, NOTIFY ME TO FIX THIS SET)
 * @apiError 500 Internal server error, or archive/repack failure
 * @apiExample {curl} Download with video (default):
 *     curl -OJ https://mirror.nekoha.moe/api4/download/12345
 * @apiExample {curl} Download without video:
 *     curl -OJ "https://mirror.nekoha.moe/api4/download/12345?noVideo=1"
 */
app.get('/api4/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId) || numericId < 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'Invalid beatmapset ID. Must be a positive number.' });
    }
    
    // Check if beatmapset exists and is downloaded
    const result = await pool.query(
      `SELECT * FROM ${process.env.TABLE_BEATMAPSET} WHERE id = $1`,
      [numericId]
    );
    
    if (result.rows.length === 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'Beatmapset not found' });
    }
    
    const beatmapset = result.rows[0];
    
    if (!beatmapset.downloaded) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'Beatmapset not downloaded yet' });
    }
    
    if (beatmapset.missing_audio) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(410).json({ error: 'Beatmapset missing (not available for download)\nContact me to upload this mapset.' });
    }

    if (beatmapset.dmca) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(410).json({ error: 'Beatmapset missing (dmca takedown)\nContact me to upload this mapset.' });
    }

    
    // Find the beatmapset folder inside STORAGE_DIR
    const storagePath = process.env.STORAGE_DIR;
    const beatmapsetFolder = path.join(storagePath, String(numericId));

    if (!fs.existsSync(beatmapsetFolder) || !fs.lstatSync(beatmapsetFolder).isDirectory()) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'Beatmapset folder not found in storage' });
    }

    // Find .osz file inside the beatmapset folder (pick largest if multiple)
    const files = fs.readdirSync(beatmapsetFolder);
    const oszFile = files
      .filter(file => file.endsWith('.osz'))
      .sort((a, b) => fs.statSync(path.join(beatmapsetFolder, b)).size - fs.statSync(path.join(beatmapsetFolder, a)).size)[0];

    if (!oszFile) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'Beatmapset .osz file not found in folder' });
    }

    const filePath = path.join(beatmapsetFolder, oszFile);

    // Only attempt video stripping if the map actually has a video
    const noVideo = req.query.noVideo === '1' && beatmapset.video === true;
    const VIDEO_EXTS = /\.(avi|flv|mp4|mov|wmv|m4v|mkv|flv)$/i;

    // Set headers for download
    res.setHeader('Content-Type', 'application/x-osu-beatmap-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${oszFile}"`);

    const fileSize = beatmapset.file_size ? BigInt(beatmapset.file_size) : 0n;

    if (noVideo) {
      // Stream a repackaged zip with video entries removed
      // store = no recompression
      const archive = new ZipArchive({ store: true });
      archive.pipe(res);
      archive.on('error', err => {
        console.error('Archiver error:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to repack beatmapset' });
        else res.destroy(err);
      });

      yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          console.error('yauzl open error:', err);
          if (!res.headersSent) res.status(500).json({ error: 'Failed to open beatmapset archive' });
          return;
        }
        zipfile.readEntry();
        zipfile.on('entry', entry => {
          if (VIDEO_EXTS.test(entry.fileName)) {
            // Skip video files
            zipfile.readEntry();
            return;
          }
          zipfile.openReadStream(entry, (err, stream) => {
            if (err) { zipfile.readEntry(); return; }
            archive.append(stream, { name: entry.fileName });
            stream.on('end', () => zipfile.readEntry());
          });
        });
        zipfile.on('end', () => archive.finalize());
        zipfile.on('error', err => {
          console.error('yauzl error:', err);
          archive.abort();
        });
      });

      // Track stats (use stored file_size as approximation since we strip video)
      res.on('finish', () => {
        pool.query(`
          INSERT INTO download_stats (day, downloads, bytes_sent)
          VALUES (CURRENT_DATE, 1, $1)
          ON CONFLICT (day) DO UPDATE
            SET downloads  = download_stats.downloads  + 1,
                bytes_sent = download_stats.bytes_sent + $1
        `, [fileSize]).catch(err => console.error('Failed to update download_stats:', err));
      });
    } else {
      // Stream the file efficiently to the client
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('open', () => {
        fileStream.pipe(res);
      });
      fileStream.on('error', (err) => {
        console.error('Error streaming file:', err);
        if (!res.headersSent) {
          res.setHeader('Content-Type', 'application/json');
          res.status(500).json({ error: 'Failed to stream beatmapset file' });
        } else {
          res.destroy(err);
        }
      });
      // Track completed download stats
      res.on('finish', () => {
        pool.query(`
          INSERT INTO download_stats (day, downloads, bytes_sent)
          VALUES (CURRENT_DATE, 1, $1)
          ON CONFLICT (day) DO UPDATE
            SET downloads  = download_stats.downloads  + 1,
                bytes_sent = download_stats.bytes_sent + $1
        `, [fileSize]).catch(err => console.error('Failed to update download_stats:', err));
      });
      // If client aborts, destroy the stream
      res.on('close', () => {
        fileStream.destroy();
      });
    }
    
  } catch (err) {
    console.error('Error downloading beatmapset:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to download beatmapset' });
  }
});

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

app.listen(port, () => {
  console.log(`Mirror API server listening on port ${port}`);
});