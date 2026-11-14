// beatmap-fetcher owns the table
export interface ArchiveRow {
    month: string;
    mode: string;
    file_name: string;
    size_gb: number;
    beatmapset_count: number;
    created_at: Date;
}