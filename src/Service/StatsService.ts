import { Cache } from '@Core/Cache/Cache';
import { Environment } from '@Bootstrap/Environment';
import { StatsRepository } from '@Repository/StatsRepository';
import { StatsRow, DownloadStatsRow, ApiRequestStatsRow, ApiCallRow } from '@Model/StatsModel';
import { toNum } from '@View/Format';

const API_CALL_WINDOW_MS = 6 * 60 * 60 * 1000;
const API_CALL_CACHE_SECONDS = 30;
const API_REQUEST_CACHE_SECONDS = 60;

export interface DataServed {
    download_bytes: number;
    api_bytes: number;
    total_bytes: number;
}

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

    static async getApiRequestStats(days: number): Promise<ApiRequestStatsRow[]> {
        const cacheKey = `api-request-stats:${days}`;
        const cached = await Cache.getJson<ApiRequestStatsRow[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const rows = await StatsRepository.getDailyApiRequests(days);
        await Cache.setJson(cacheKey, rows, API_REQUEST_CACHE_SECONDS);
        return rows;
    }

    static async getDataServed(): Promise<DataServed> {
        const cacheKey = 'data-served';
        const cached = await Cache.getJson<DataServed>(cacheKey);
        if (cached) {
            return cached;
        }

        const row = await StatsRepository.getTotalDataServed();
        const downloadBytes = toNum(row.download_bytes) ?? 0;
        const apiBytes = toNum(row.api_bytes) ?? 0;

        const payload = {
            download_bytes: downloadBytes,
            api_bytes: apiBytes,
            total_bytes: downloadBytes + apiBytes,
        };
        await Cache.setJson(cacheKey, payload, API_REQUEST_CACHE_SECONDS);
        return payload;
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