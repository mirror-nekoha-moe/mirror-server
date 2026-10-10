// pg gives BIGINT back as a string
export type DbNumber = number | string;

// beatmap-fetcher owns the schema
export interface BeatmapsetRow {
    [column: string]: any;
    id: DbNumber;
    downloaded: boolean | null;
    video: boolean | null;
    file_size: DbNumber | null;

    // TODO add to the table, download already checks them
    dmca?: boolean | null;
    missing_audio?: boolean | null;
}

export interface OszSizeRow {
    id: DbNumber;
    file_size: DbNumber | null;
}

export interface BeatmapRange {
    column: string;
    operator: '>=' | '<=';
    value: number;
}

export interface SearchFilters {
    text: string | null;
    beatmapsetId: number | null;
    beatmapId: number | null;
    statuses: string[];
    modeColumns: string[];
    video: boolean | null;
    bpmMin: number | null;
    bpmMax: number | null;
    beatmapRanges: BeatmapRange[];
    sortColumn: string;
    sortDirection: 'ASC' | 'DESC';
    page: number;
}