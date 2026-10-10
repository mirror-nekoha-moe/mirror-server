import { Cache } from '@Core/Cache/Cache';
import { Environment } from '@Bootstrap/Environment';
import { BeatmapRepository } from '@Repository/BeatmapRepository';
import { BeatmapView, BeatmapJson } from '@View/BeatmapView';

export class BeatmapService {
    static async getBeatmap(id: number): Promise<BeatmapJson | null> {
        const cacheKey = `beatmap:${id}`;
        const cached = await Cache.getJson<BeatmapJson>(cacheKey);
        if (cached) {
            return cached;
        }

        const row = await BeatmapRepository.getById(id);
        if (!row) {
            return null;
        }

        const beatmap = BeatmapView.render(row);
        await Cache.setJson(cacheKey, beatmap, Environment.env.REDIS_CACHE_TIME_LONG);
        return beatmap;
    }
}