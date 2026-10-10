import { DbNumber } from '@Model/BeatmapsetModel';

// beatmap-fetcher owns the schema
export interface BeatmapRow {
    [column: string]: any;
    id: DbNumber;
    beatmapset_id: DbNumber;
    checksum: string | null;
}