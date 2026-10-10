import { Cache } from '@Core/Cache/Cache';
import { Environment } from '@Bootstrap/Environment';
import { StatsRepository } from '@Repository/StatsRepository';
import { StatsRow, DownloadStatsRow, ApiCallRow } from '@Model/StatsModel';

const API_CALL_WINDOW_MS = 6 * 60 * 60 * 1000;
const API_CALL_CACHE_SECONDS = 30;

export interface ApiCallStats {
    v1: ApiCallRow[];
    v2: ApiCallRow[];
}

type StatsResponse = StatsRow | [];

export class StatsService {
    static async getStats(): Promise<StatsResponse> {
        const cacheKey = 'stats';
        const cached = await Cache.getJson<StatsResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const stats = await StatsRepository.getStats();
        if (!stats) {
            await Cache.setJson(cacheKey, [], Environment.env.REDIS_CACHE_TIME);
            return [];
        }

        await Cache.setJson(cacheKey, stats, Environment.env.REDIS_CACHE_TIME);
        return stats;
    }

    static async getDownloadStats(days: number): Promise<DownloadStatsRow[]> {
        const cacheKey = `download-stats:${days}`;
        const cached = await Cache.getJson<DownloadStatsRow[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const rows = await StatsRepository.getDailyDownloads(days);
        await Cache.setJson(cacheKey, rows, Environment.env.REDIS_CACHE_TIME);
        return rows;
    }

    static async getApiCallStats(): Promise<ApiCallStats> {
        const cacheKey = 'api-call-stats';
        const cached = await Cache.getJson<ApiCallStats>(cacheKey);
        if (cached) {
            return cached;
        }

        const since = new Date(Date.now() - API_CALL_WINDOW_MS);
        const [v1, v2] = await Promise.all([
            StatsRepository.getApiCallsV1(since),
            StatsRepository.getApiCallsV2(since),
        ]);

        const payload = { v1, v2 };
        await Cache.setJson(cacheKey, payload, API_CALL_CACHE_SECONDS);
        return payload;
    }
}