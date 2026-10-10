import { DbNumber } from '@Model/BeatmapsetModel';

export interface RequestItemInput {
    type: 'new' | 'update';
    beatmapsetId: number | string;
    beatmapsetUrl: string;
    oszUrl: string;
    notes?: string | null;
}

export interface RequestBatchRow {
    id: DbNumber;
    status: string;
    created_at: Date;
}

export interface RequestBatchSummaryRow extends RequestBatchRow {
    item_count: number;
}

export interface RequestItemRow {
    id: DbNumber;
    type: string | null;
    beatmapset_id: string | null;
    beatmapset_url: string | null;
    osz_url: string | null;
    notes: string | null;
}