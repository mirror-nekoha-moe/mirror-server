import express from 'express';
import cors from 'cors';

import { app, pool, port } from './Constants.js';

// Middleware
app.use(cors());
app.use(express.json());

import ('./EndpointRegister.js');

// Ensure download_stats table exists
await pool.query(`
    CREATE TABLE IF NOT EXISTS download_stats (
        day DATE PRIMARY KEY DEFAULT CURRENT_DATE,
        downloads BIGINT NOT NULL DEFAULT 0,
        bytes_sent BIGINT NOT NULL DEFAULT 0
    );
`);
console.log('download_stats table is ready');

await pool.query(`
    CREATE TABLE IF NOT EXISTS request_batch (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
`);
console.log('request_batch table is ready');

await pool.query(`
    CREATE TABLE IF NOT EXISTS request_item (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

        batch_id BIGINT NOT NULL,

        type VARCHAR(32),
        beatmapset_id VARCHAR(32),
        beatmapset_url TEXT,
        osz_url TEXT,
        notes TEXT,

        CONSTRAINT fk_request_batch
            FOREIGN KEY (batch_id)
            REFERENCES request_batch(id)
            ON DELETE CASCADE
    );
`);
console.log('request_item table is ready');

await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_request_item_batch_id
    ON request_item(batch_id);
`);
console.log('Index for request tables are ready');

console.log('Database tables ready');

app.listen(port, () => {
    console.log(`Mirror API server listening on port ${port}`);
});