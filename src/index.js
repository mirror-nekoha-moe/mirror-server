import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT;

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

// Stats endpoint
app.get('/api4/stats', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${process.env.TABLE_STATS}`);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json({
        last_beatmapset_id: 0,
        beatmapset_count: 0,
        beatmap_count: 0,
        ranked_count: 0,
        approved_count: 0,
        loved_count: 0,
        graveyard_count: 0,
        pending_count: 0,
        total_size: 0
      });
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Beatmapset endpoint (metadata only, no beatmaps)
app.get('/api4/beatmapset/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId) || numericId < 0) {
      return res.status(400).json({ error: 'Invalid beatmapset ID. Must be a positive number.' });
    }
    
    const result = await pool.query(
      `SELECT * FROM ${process.env.TABLE_BEATMAPSET} WHERE id = $1`,
      [numericId]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Beatmapset not found' });
    }
  } catch (err) {
    console.error('Error fetching beatmapset:', err);
    res.status(500).json({ error: 'Failed to fetch beatmapset' });
  }
});

// Beatmapset full endpoint (with beatmaps array)
app.get('/api4/beatmapsetFull/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId) || numericId < 0) {
      return res.status(400).json({ error: 'Invalid beatmapset ID. Must be a positive number.' });
    }
    
    // Get beatmapset data
    const beatmapsetResult = await pool.query(
      `SELECT * FROM ${process.env.TABLE_BEATMAPSET} WHERE id = $1`,
      [numericId]
    );
    
    if (beatmapsetResult.rows.length === 0) {
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
    
    res.json(fullData);
  } catch (err) {
    console.error('Error fetching full beatmapset:', err);
    res.status(500).json({ error: 'Failed to fetch full beatmapset' });
  }
});

// Beatmap endpoint (single beatmap)
app.get('/api4/beatmap/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId) || numericId < 0) {
      return res.status(400).json({ error: 'Invalid beatmap ID. Must be a positive number.' });
    }
    
    const result = await pool.query(
      `SELECT * FROM ${process.env.TABLE_BEATMAP} WHERE id = $1`,
      [numericId]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Beatmap not found' });
    }
  } catch (err) {
    console.error('Error fetching beatmap:', err);
    res.status(500).json({ error: 'Failed to fetch beatmap' });
  }
});

// Download beatmapset endpoint
app.get('/api4/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId) || numericId < 0) {
      return res.status(400).json({ error: 'Invalid beatmapset ID. Must be a positive number.' });
    }
    
    // Check if beatmapset exists and is downloaded
    const result = await pool.query(
      `SELECT * FROM ${process.env.TABLE_BEATMAPSET} WHERE id = $1`,
      [numericId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beatmapset not found' });
    }
    
    const beatmapset = result.rows[0];
    
    if (!beatmapset.downloaded) {
      return res.status(404).json({ error: 'Beatmapset not downloaded yet' });
    }
    
    if (beatmapset.missing_audio) {
      return res.status(410).json({ error: 'Beatmapset missing (not available for download)\nContact me to upload this mapset.' });
    }
    
    // Find the .osz file in storage
    const storagePath = '../beatmap-fetcher/storage';
    const beatmapsetFolder = path.join(storagePath, String(numericId));
    
    if (!fs.existsSync(beatmapsetFolder)) {
      return res.status(404).json({ error: 'Beatmapset file not found on disk' });
    }
    
    // Find .osz file
    const files = fs.readdirSync(beatmapsetFolder);
    const oszFile = files.find(file => file.endsWith('.osz'));
    
    if (!oszFile) {
      return res.status(404).json({ error: 'Beatmapset .osz file not found' });
    }
    
    const filePath = path.join(beatmapsetFolder, oszFile);
    
    // Set headers for download
    res.setHeader('Content-Type', 'application/x-osu-beatmap-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${oszFile}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream beatmapset file' });
      }
    });
    
  } catch (err) {
    console.error('Error downloading beatmapset:', err);
    res.status(500).json({ error: 'Failed to download beatmapset' });
  }
});

app.listen(port, () => {
  console.log(`Mirror API server listening on port ${port}`);
});