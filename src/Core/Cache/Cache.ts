import Redis from 'ioredis';
import { Environment } from '@Bootstrap/Environment';

const redis = new Redis({
    host: Environment.env.REDIS_HOST,
    port: Environment.env.REDIS_PORT,
});

export class Cache {
    static async getJson<T>(key: string): Promise<T | null> {
        const cached = await redis.get(key);
        if (!cached) {
            return null;
        }
        return JSON.parse(cached) as T;
    }

    static async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    }

    static async getRaw(key: string): Promise<string | null> {
        return redis.get(key);
    }

    static async setRaw(key: string, value: string, ttlSeconds: number): Promise<void> {
        await redis.set(key, value, 'EX', ttlSeconds);
    }
}