import { BeatmapsetRow } from '@Model/BeatmapsetModel';
import { BeatmapRow } from '@Model/BeatmapModel';
import { BeatmapsetView } from '@View/BeatmapsetView';

export class BeatmapsetEventView {
    static render(source: string, type: string, event: unknown, row: BeatmapsetRow | null, beatmapRows: BeatmapRow[]) {
        let beatmapset = null;
        if (row) {
            beatmapset = BeatmapsetView.render(row, beatmapRows);
        }

        return {
            source,
            type,
            event,
            beatmapset,
        };
    }
}

export type BeatmapsetEventJson = ReturnType<typeof BeatmapsetEventView.render>;