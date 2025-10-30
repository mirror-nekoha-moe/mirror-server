import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

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
        pending_count: 0
      });
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.listen(port, () => {
  console.log(`Mirror API server listening on port ${port}`);
});