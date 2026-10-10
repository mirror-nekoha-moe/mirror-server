import path from 'path';
import dotenv from 'dotenv';

const REQUIRED_VARS = [
    // PostgreSQL
    'PG_HOSTNAME',
    'PG_USERNAME',
    'PG_PASSWORD',
    'PG_DATABASE',

    // Table Names
    'TABLE_BEATMAPSET',
    'TABLE_BEATMAP',
    'TABLE_STATS',

    // Redis
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_CACHE_TIME',
    'REDIS_CACHE_TIME_LONG',

    // Settings
    'STORAGE_DIR',
    'PORT',
];

export interface EnvType {
    PG_HOSTNAME: string;
    PG_USERNAME: string;
    PG_PASSWORD: string;
    PG_DATABASE: string;
    PG_MAX_CONN: number;
    PG_CONN_TIMEOUT: number;
    PG_IDLE_TIMEOUT: number;
    PG_STATEMENT_TIMEOUT: number;

    TABLE_BEATMAPSET: string;
    TABLE_BEATMAP: string;
    TABLE_STATS: string;

    REDIS_HOST: string;
    REDIS_PORT: number;
    REDIS_CACHE_TIME: number;
    REDIS_CACHE_TIME_LONG: number;

    STORAGE_DIR: string;
    STREAM_CHUNK_SIZE_KB: number;
    PORT: number;
    DOMAIN: string;
    DISCORD_REQUEST_WEBHOOK_URL: string;

    DB_QUERY_CONCURRENCY: number;
    DB_QUEUE_LIMIT: number;
}

function readString(name: string): string {
    return process.env[name] ?? '';
}

function readNumber(name: string, fallback: number): number {
    const value = parseInt(process.env[name] ?? '', 10);
    if (isNaN(value)) {
        return fallback;
    }
    return value;
}

export class Environment {
    public static env: EnvType;

    public static initialize(): void {
        dotenv.config({ path: path.resolve(__dirname, '../.env') });

        let missingEnv = 0;
        for (const varName of REQUIRED_VARS) {
            const value = process.env[varName];
            if (!value || value.trim() === '') {
                console.error(`Environment variable "${varName}" is missing or empty.`);
                missingEnv++;
            }
        }
        if (missingEnv > 0) {
            process.exit(1);
        }

        Environment.env = {
            PG_HOSTNAME: readString('PG_HOSTNAME'),
            PG_USERNAME: readString('PG_USERNAME'),
            PG_PASSWORD: readString('PG_PASSWORD'),
            PG_DATABASE: readString('PG_DATABASE'),
            PG_MAX_CONN: readNumber('PG_MAX_CONN', 16),
            PG_CONN_TIMEOUT: readNumber('PG_CONN_TIMEOUT', 30000),
            PG_IDLE_TIMEOUT: readNumber('PG_IDLE_TIMEOUT', 30000),
            PG_STATEMENT_TIMEOUT: readNumber('PG_STATEMENT_TIMEOUT', 30000),

            TABLE_BEATMAPSET: readString('TABLE_BEATMAPSET'),
            TABLE_BEATMAP: readString('TABLE_BEATMAP'),
            TABLE_STATS: readString('TABLE_STATS'),

            REDIS_HOST: readString('REDIS_HOST'),
            REDIS_PORT: readNumber('REDIS_PORT', 6379),
            REDIS_CACHE_TIME: readNumber('REDIS_CACHE_TIME', 10800),
            REDIS_CACHE_TIME_LONG: readNumber('REDIS_CACHE_TIME_LONG', 172800),

            STORAGE_DIR: readString('STORAGE_DIR'),
            STREAM_CHUNK_SIZE_KB: readNumber('STREAM_CHUNK_SIZE_KB', 4096),
            PORT: readNumber('PORT', 30727),
            DOMAIN: readString('DOMAIN'),
            DISCORD_REQUEST_WEBHOOK_URL: readString('DISCORD_REQUEST_WEBHOOK_URL'),

            DB_QUERY_CONCURRENCY: readNumber('DB_QUERY_CONCURRENCY', 16),
            DB_QUEUE_LIMIT: readNumber('DB_QUEUE_LIMIT', 5000),
        };
    }
}