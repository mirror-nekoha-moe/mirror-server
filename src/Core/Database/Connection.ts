import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { Environment } from '@Bootstrap/Environment';

interface QueuedQuery {
    text: string;
    values: unknown[];
    resolve: (result: QueryResult<any>) => void;
    reject: (err: Error) => void;
}

const pool = new Pool({
    host: Environment.env.PG_HOSTNAME,
    user: Environment.env.PG_USERNAME,
    password: Environment.env.PG_PASSWORD,
    database: Environment.env.PG_DATABASE,

    // per-worker cap
    max: Environment.env.PG_MAX_CONN,
    connectionTimeoutMillis: Environment.env.PG_CONN_TIMEOUT,
    idleTimeoutMillis: Environment.env.PG_IDLE_TIMEOUT,
    statement_timeout: Environment.env.PG_STATEMENT_TIMEOUT,
});

export class Database {
    private static active = 0;
    private static queue: QueuedQuery[] = [];

    static query<T extends QueryResultRow = any>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
        return new Promise((resolve, reject) => {
            if (Database.queue.length >= Environment.env.DB_QUEUE_LIMIT) {
                reject(new Error('Database query queue is full, server is overloaded'));
                return;
            }
            Database.queue.push({ text, values, resolve, reject });
            Database.runNext();
        });
    }

    static connect(): Promise<PoolClient> {
        return pool.connect();
    }

    private static runNext(): void {
        if (Database.active >= Environment.env.DB_QUERY_CONCURRENCY) {
            return;
        }
        const next = Database.queue.shift();
        if (!next) {
            return;
        }

        Database.active++;
        pool.query(next.text, next.values)
            .then(next.resolve, next.reject)
            .finally(() => {
                Database.active--;
                Database.runNext();
            });
    }
}