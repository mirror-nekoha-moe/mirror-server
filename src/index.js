import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';

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

// Middleware
app.use(cors());
app.use(express.json());

/**
 * @api {get} /api4/stats Get beatmap mirror statistics
 * @apiName stats
 * @apiGroup Stats
 * @apiSuccess {Number} last_beatmapset_id Last beatmapset ID in the database
 * @apiSuccess {Number} beatmapset_count Total number of beatmapsets
 * @apiSuccess {Number} beatmap_count Total number of beatmaps
 * @apiSuccess {Number} ranked_count Number of ranked beatmapsets
 * @apiSuccess {Number} approved_count Number of approved beatmapsets
 * @apiSuccess {Number} loved_count Number of loved beatmapsets
 * @apiSuccess {Number} graveyard_count Number of graveyard beatmapsets
 * @apiSuccess {Number} pending_count Number of pending beatmapsets
 * @apiSuccess {Number} total_size Total size of all .osz files (bytes)
 * @apiSuccess {Number} bm_ranked_count Number of ranked beatmaps
 * @apiSuccess {Number} bm_approved_count Number of approved beatmaps
 * @apiSuccess {Number} bm_loved_count Number of loved beatmaps
 * @apiSuccess {Number} bm_graveyard_count Number of graveyard beatmaps
 * @apiSuccess {Number} bm_pending_count Number of pending beatmaps
 * @apiSuccess {Number} missing_beatmapsets Number of missing beatmapsets
 * @apiSuccess {Number} osu_bm_ranked_count Ranked osu! beatmaps
 * @apiSuccess {Number} osu_bm_approved_count Approved osu! beatmaps
 * @apiSuccess {Number} osu_bm_loved_count Loved osu! beatmaps
 * @apiSuccess {Number} osu_bm_graveyard_count Graveyard osu! beatmaps
 * @apiSuccess {Number} osu_bm_pending_count Pending osu! beatmaps
 * @apiSuccess {Number} taiko_bm_ranked_count Ranked taiko beatmaps
 * @apiSuccess {Number} taiko_bm_approved_count Approved taiko beatmaps
 * @apiSuccess {Number} taiko_bm_loved_count Loved taiko beatmaps
 * @apiSuccess {Number} taiko_bm_graveyard_count Graveyard taiko beatmaps
 * @apiSuccess {Number} taiko_bm_pending_count Pending taiko beatmaps
 * @apiSuccess {Number} fruits_bm_ranked_count Ranked ctb beatmaps
 * @apiSuccess {Number} fruits_bm_approved_count Approved ctb beatmaps
 * @apiSuccess {Number} fruits_bm_loved_count Loved ctb beatmaps
 * @apiSuccess {Number} fruits_bm_graveyard_count Graveyard ctb beatmaps
 * @apiSuccess {Number} fruits_bm_pending_count Pending ctb beatmaps
 * @apiSuccess {Number} mania_bm_ranked_count Ranked mania beatmaps
 * @apiSuccess {Number} mania_bm_approved_count Approved mania beatmaps
 * @apiSuccess {Number} mania_bm_loved_count Loved mania beatmaps
 * @apiSuccess {Number} mania_bm_graveyard_count Graveyard mania beatmaps
 * @apiSuccess {Number} mania_bm_pending_count Pending mania beatmaps
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
    let stats;
    if (result.rows.length > 0) {
      stats = result.rows[0];
    } else {
      stats = {
        last_beatmapset_id: 0,
        beatmapset_count: 0,
        beatmap_count: 0,
        ranked_count: 0,
        approved_count: 0,
        loved_count: 0,
        graveyard_count: 0,
        pending_count: 0,
        total_size: 0,
        bm_ranked_count: 0,
        bm_approved_count: 0,
        bm_loved_count: 0,
        bm_graveyard_count: 0,
        bm_pending_count: 0,
        missing_beatmapsets: 0,
        osu_bm_ranked_count: 0,
				osu_bm_approved_count: 0,
				osu_bm_loved_count: 0,
				osu_bm_graveyard_count: 0,
				osu_bm_pending_count: 0,
				taiko_bm_ranked_count: 0,
				taiko_bm_approved_count: 0,
				taiko_bm_loved_count: 0,
				taiko_bm_graveyard_count: 0,
				taiko_bm_pending_count: 0,
				fruits_bm_ranked_count: 0,
				fruits_bm_approved_count: 0,
				fruits_bm_loved_count: 0,
				fruits_bm_graveyard_count: 0,
				fruits_bm_pending_count: 0,
				mania_bm_ranked_count: 0,
				mania_bm_approved_count: 0,
				mania_bm_loved_count: 0,
				mania_bm_graveyard_count: 0,
				mania_bm_pending_count: 0
      };
    }
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
 * @apiParam {Number} id Beatmapset ID
 * @apiSuccess {Number} id Beatmapset ID
 * @apiSuccess {Number} file_size Size of the .osz file in bytes
 * @apiError 400 Invalid beatmapset ID
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
 * @apiParam {String} [q] General search (title, artist, creator, tags)
 * @apiParam {Number} [page=1] Page number (pagination, 100 per page)
 * @apiParam {String} [sort] Sort field
 * @apiParam {String} [order=desc] Sort order (asc/desc)
 * @apiSuccess {Object[]} beatmapsets List of beatmapsets with beatmaps array
 * @apiError 500 Internal server error
 * @apiExample {curl} Example usage:
 *     curl "https://mirror.nekoha.moe/api4/search?q=camellia&page=1"
 */
app.get('/api4/search', async (req, res) => {
  try {
    // Generate a cache key based on endpoint and sorted query params
    const queryParams = { ...req.query };
    const sortedKeys = Object.keys(queryParams).sort();
    const keyParts = sortedKeys.map(k => `${k}=${queryParams[k]}`);
    const cacheKey = `search:${keyParts.join('&')}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const { q, sort, order = 'desc', page = 1 } = req.query;

    const allowedSortFields = [
      'id'
      ,'status'
      ,'title'
      ,'artist'
      ,'creator'
      ,'user_id'
      ,'source'
      ,'tags'
      ,'beatmap_count'
      ,'osu'
      ,'taiko'
      ,'fruits'
      ,'mania'
      ,'bpm'
      ,'submitted'
      ,'updated'
      ,'ranked'
      ,'genre_id'
      ,'language_id'
      ,'missing_audio'
      ,'deleted'
      ,'downloaded'
      ,'file_size'
    ];

    const where = [];
    const values = [];
    let idx = 1;

    if (q) {
      where.push(`(title ILIKE $${idx} OR artist ILIKE $${idx} OR creator ILIKE $${idx} OR tags ILIKE $${idx})`);
      values.push(`%${q}%`); idx++;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = 100;
    const offset = (pageNum - 1) * limit;

    let baseQuery = `SELECT * FROM ${process.env.TABLE_BEATMAPSET}`;
    if (where.length) baseQuery += ' WHERE ' + where.join(' AND ');

    let sortField = sort;
    if (!sortField || !allowedSortFields.includes(sortField)) sortField = 'ranked';
    let sortClause = `ORDER BY ${sortField} ${order === 'asc' ? 'ASC' : 'DESC'}`;

    const query = `${baseQuery} ${sortClause} LIMIT ${limit} OFFSET ${offset}`;
    const result = await pool.query(query, values);
    let rows = result.rows;

    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      const bmRes = await pool.query(
        `SELECT * FROM ${process.env.TABLE_BEATMAP} WHERE beatmapset_id = ANY($1)`, [ids]
      );
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
 * @apiParam {Number} id Beatmapset ID
 * @apiSuccess {Object} beatmapset Beatmapset metadata object
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
 * @apiParam {Number} id Beatmapset ID
 * @apiSuccess {Object} beatmapset Beatmapset metadata object
 * @apiSuccess {Object[]} beatmapset.beatmaps Array of beatmaps in this beatmapset, sorted by difficulty_rating ASC
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
 * @apiParam {Number} id Beatmap ID
 * @apiSuccess {Object} beatmap Beatmap metadata object
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
 * @apiParam {Number} id Beatmapset ID
 * @apiSuccess {File} .osz The beatmapset archive file
 * @apiError 400 Invalid beatmapset ID (must be a positive number)
 * @apiError 404 Beatmapset not found, not downloaded, folder missing, or .osz file missing
 * @apiError 410 Beatmapset missing audio (not available for download)
 * @apiError 500 Internal server error
 * @apiExample {curl} Example usage:
 *     curl -OJ https://mirror.nekoha.moe/api4/download/12345
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
    
    // Find the beatmapset folder inside STORAGE_DIR
    const storagePath = process.env.STORAGE_DIR;
    const beatmapsetFolder = path.join(storagePath, String(numericId));

    if (!fs.existsSync(beatmapsetFolder) || !fs.lstatSync(beatmapsetFolder).isDirectory()) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'Beatmapset folder not found in storage' });
    }

    // Find .osz file inside the beatmapset folder
    const files = fs.readdirSync(beatmapsetFolder);
    const oszFile = files.find(file => file.endsWith('.osz'));

    if (!oszFile) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'Beatmapset .osz file not found in folder' });
    }

    const filePath = path.join(beatmapsetFolder, oszFile);

    // Set headers for download
    res.setHeader('Content-Type', 'application/x-osu-beatmap-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${oszFile}"`);

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
    // If client aborts, destroy the stream
    res.on('close', () => {
      fileStream.destroy();
    });
    
  } catch (err) {
    console.error('Error downloading beatmapset:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to download beatmapset' });
  }
});

app.listen(port, () => {
  console.log(`Mirror API server listening on port ${port}`);
});