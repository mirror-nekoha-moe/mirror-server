import cluster from 'cluster';
import { Cache } from '@Core/Cache/Cache';
import { EVENT_MESSAGE } from '@Core/Http/EventSocket';
import { BeatmapsetRepository } from '@Repository/BeatmapsetRepository';
import { BeatmapRepository } from '@Repository/BeatmapRepository';
import { BeatmapRow } from '@Model/BeatmapModel';
import { BeatmapsetEventView } from '@View/BeatmapsetEventView';
import { BeatmapsetService } from '@Service/BeatmapsetService';
import { BeatmapService } from '@Service/BeatmapService';

const CHANNEL = 'beatmapset_events';

export class BeatmapsetEventService {
    static start(): void {
        Cache.subscribe(CHANNEL, (message) => {
            BeatmapsetEventService.handleMessage(message)
                .catch((err) => console.error('Failed to send beatmapset event:', err));
        });
    }

    private static async handleMessage(message: string): Promise<void> {
        const payload = JSON.parse(message);
        const beatmapsetId: number | null = payload.beatmapset_id;

        let row = null;
        let beatmapRows: BeatmapRow[] = [];
        if (beatmapsetId) {
            row = await BeatmapsetRepository.getById(beatmapsetId);
            if (row) {
                beatmapRows = await BeatmapRepository.getByBeatmapsetId(beatmapsetId);
            }
        }

        const json = BeatmapsetEventView.render(payload.source, payload.type, payload.event, row, beatmapRows);
        const data = JSON.stringify(json);

        for (const worker of Object.values(cluster.workers ?? {})) {
            worker?.send({ type: EVENT_MESSAGE, data });
        }

        if (beatmapsetId && row && json.beatmapset) {
            await BeatmapsetService.setCachedBeatmapset(beatmapsetId, json.beatmapset);
            await BeatmapService.setCachedBeatmaps(beatmapRows, row);
        }
    }
}