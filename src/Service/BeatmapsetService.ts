import { Cache } from '@Core/Cache/Cache';
import { Environment } from '@Bootstrap/Environment';
import { BeatmapsetRepository } from '@Repository/BeatmapsetRepository';
import { BeatmapRepository } from '@Repository/BeatmapRepository';
import { BeatmapsetView, BeatmapsetJson } from '@View/BeatmapsetView';
import { OszSizeRow } from '@Model/BeatmapsetModel';

export class BeatmapsetService {
    private static cacheKey(id: number): string {
        return `beatmapset:${id}`;
    }

    static async setCachedBeatmapset(id: number, beatmapset: BeatmapsetJson): Promise<void> {
        await Cache.setJson(BeatmapsetService.cacheKey(id), beatmapset, Environment.env.REDIS_CACHE_TIME_LONG);
    }

    static async getBeatmapset(id: number): Promise<BeatmapsetJson | null> {
        const cached = await Cache.getJson<BeatmapsetJson>(BeatmapsetService.cacheKey(id));
        if (cached) {
            return cached;
        }

        const row = await BeatmapsetRepository.getById(id);
        if (!row) {
            return null;
        }
        const beatmapRows = await BeatmapRepository.getByBeatmapsetId(id);

        const beatmapset = BeatmapsetView.render(row, beatmapRows);
        await BeatmapsetService.setCachedBeatmapset(id, beatmapset);
        return beatmapset;
    }

    static async getOszSize(id: number): Promise<OszSizeRow | null> {
        const cacheKey = `osz:${id}`;
        const cached = await Cache.getJson<OszSizeRow>(cacheKey);
        if (cached) {
            return cached;
        }

        const row = await BeatmapsetRepository.getOszSize(id);
        if (!row) {
            return null;
        }

        await Cache.setJson(cacheKey, row, Environment.env.REDIS_CACHE_TIME_LONG);
        return row;
    }

    static async getAllOszSizesJson(): Promise<string | null> {
        const cacheKey = 'oszFull';
        const cached = await Cache.getRaw(cacheKey);
        if (cached) {
            return cached;
        }

        const rows = await BeatmapsetRepository.getAllOszSizes();
        if (rows.length === 0) {
            return null;
        }

        const payload = JSON.stringify(rows);
        await Cache.setRaw(cacheKey, payload, Environment.env.REDIS_CACHE_TIME_LONG);
        return payload;
    }
}