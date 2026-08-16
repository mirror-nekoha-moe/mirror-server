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
const pgPool = new pg.Pool({
    host: process.env.PG_HOSTNAME,
    user: process.env.PG_USERNAME,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,

    // per-worker cap
    max: 16,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    statement_timeout: 30000,
});

const DB_QUERY_CONCURRENCY = parseInt(process.env.DB_QUERY_CONCURRENCY || '16', 10);
const DB_QUEUE_LIMIT = parseInt(process.env.DB_QUEUE_LIMIT || '5000', 10);

let active = 0;
const queue = [];

function runNext() {
    if (active >= DB_QUERY_CONCURRENCY || queue.length === 0) return;
    active++;
    const { args, resolve, reject } = queue.shift();
    pgPool.query(...args)
        .then(resolve, reject)
        .finally(() => {
            active--;
            runNext();
        });
}

function queuedQuery(...args) {
    return new Promise((resolve, reject) => {
        if (queue.length >= DB_QUEUE_LIMIT) {
            reject(new Error('Database query queue is full, server is overloaded'));
            return;
        }
        queue.push({ args, resolve, reject });
        runNext();
    });
}

export const pool = {
    query: queuedQuery,
    connect: pgPool.connect.bind(pgPool),
};
