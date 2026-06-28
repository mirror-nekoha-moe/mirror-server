import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
export const yauzl = require('yauzl');
export const { ZipArchive } = require('archiver');

dotenv.config({
    path: resolve(dirname(fileURLToPath(import.meta.url)),'.env')
});

export const app = express();
export const port = process.env.PORT;

export const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
});

// Database connection
export const pool = new pg.Pool({
  host: process.env.PG_HOSTNAME,
  user: process.env.PG_USERNAME,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});
