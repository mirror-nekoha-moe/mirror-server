import { DbNumber } from '@Model/BeatmapsetModel';

// ~60 columns owned by beatmap-fetcher
export type StatsRow = Record<string, unknown>;

export interface DownloadStatsRow {
    day: Date;
    downloads: DbNumber;
    bytes_sent: DbNumber;
}

export interface ApiCallRow {
    minute: Date;
    calls: DbNumber;
}