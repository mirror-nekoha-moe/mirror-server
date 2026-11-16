import { Cache } from '@Core/Cache/Cache';
import { Environment } from '@Bootstrap/Environment';
import { BeatmapRepository } from '@Repository/BeatmapRepository';
import { BeatmapsetRepository } from '@Repository/BeatmapsetRepository';
import { BeatmapView, BeatmapJson } from '@View/BeatmapView';
import { BeatmapRow } from '@Model/BeatmapModel';
import { BeatmapsetRow } from '@Model/BeatmapsetModel';

export class BeatmapService {
    private static cacheKey(id: number): string {
        return `beatmap:${id}`;
    }

    static async setCachedBeatmap(id: number, beatmap: BeatmapJson): Promise<void> {
        await Cache.setJson(BeatmapService.cacheKey(id), beatmap, Environment.env.REDIS_CACHE_TIME_LONG);
    }

    static async setCachedBeatmaps(beatmapRows: BeatmapRow[], beatmapsetRow: BeatmapsetRow): Promise<void> {
        for (const row of beatmapRows) {
            const beatmap = BeatmapView.renderWithBeatmapset(row, beatmapsetRow);
            await BeatmapService.setCachedBeatmap(Number(row.id), beatmap);
        }
    }

    static async getBeatmap(id: number): Promise<BeatmapJson | null> {
        const cached = await Cache.getJson<BeatmapJson>(BeatmapService.cacheKey(id));
        if (cached) {
            return cached;
        }

        const row = await BeatmapRepository.getById(id);
        if (!row) {
            return null;
        }

        const beatmapsetId = Number(row.beatmapset_id);
        const beatmapsetRow = await BeatmapsetRepository.getById(beatmapsetId);

        const beatmap = BeatmapView.renderWithBeatmapset(row, beatmapsetRow);
        await BeatmapService.setCachedBeatmap(id, beatmap);
        return beatmap;
    }
}