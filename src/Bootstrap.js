import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

import { app, pool, port } from './Constants.js';
import ('./EndpointRegister.js');

// Ensure download_stats table exists
await pool.query(`
    CREATE TABLE IF NOT EXISTS download_stats (
        day DATE PRIMARY KEY DEFAULT CURRENT_DATE,
        downloads BIGINT NOT NULL DEFAULT 0,
        bytes_sent BIGINT NOT NULL DEFAULT 0
    )
`);
console.log('download_stats table ready');

// Middleware
app.use(cors());
app.use(express.json());

app.listen(port, () => {
    console.log(`Mirror API server listening on port ${port}`);
});