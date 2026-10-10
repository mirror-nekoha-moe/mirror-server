import type { ParsedQs } from 'qs';
import { Cache } from '@Core/Cache/Cache';
import { Environment } from '@Bootstrap/Environment';
import { readQueryString } from '@Core/Http/Http';
import { BeatmapsetRepository } from '@Repository/BeatmapsetRepository';
import { BeatmapRepository } from '@Repository/BeatmapRepository';
import { BeatmapsetView, BeatmapsetJson } from '@View/BeatmapsetView';
import { BeatmapRow } from '@Model/BeatmapModel';
import { BeatmapRange, SearchFilters } from '@Model/BeatmapsetModel';

const VALID_STATUSES = ['ranked', 'approved', 'loved', 'pending', 'graveyard', 'wip', 'qualified'];

const MODE_COLUMNS = new Map<string, string>([
    ['osu', 'mode_osu_count'],
    ['taiko', 'mode_taiko_count'],
    ['fruits', 'mode_fruits_count'],
    ['catch', 'mode_fruits_count'],
    ['mania', 'mode_mania_count'],
]);

// goes straight into ORDER BY
const SORT_COLUMNS = new Map<string, string>([
    ['id', 'id'],
    ['title', 'title'],
    ['artist', 'artist'],
    ['creator', 'creator'],
    ['bpm', 'bpm'],
    ['updated', 'last_updated'],
    ['ranked', 'ranked_date'],
    ['submitted', 'submitted_date'],
    ['favourites', 'favourite_count'],
    ['difficulty', 'beatmap_count'],
]);

// [query param, beatmap column, operator]
const BEATMAP_RANGE_PARAMS: [string, string, '>=' | '<='][] = [
    ['stars_min', 'difficulty_rating', '>='],
    ['stars_max', 'difficulty_rating', '<='],
    ['ar_min', 'ar', '>='],
    ['ar_max', 'ar', '<='],
    ['cs_min', 'cs', '>='],
    ['cs_max', 'cs', '<='],
    ['od_min', 'accuracy', '>='],
    ['od_max', 'accuracy', '<='],
    ['hp_min', 'drain', '>='],
    ['hp_max', 'drain', '<='],
    ['length_min', 'total_length', '>='],
    ['length_max', 'total_length', '<='],
];

export interface SearchResponse {
    beatmapsets: BeatmapsetJson[];
}

function parseFloatOrNull(value: unknown): number | null {
    const text = readQueryString(value);
    if (text === undefined || text === '') {
        return null;
    }
    const number = parseFloat(text);
    if (isNaN(number)) {
        return null;
    }
    return number;
}

function parseIntOrNull(value: unknown): number | null {
    const text = readQueryString(value);
    if (!text) {
        return null;
    }
    const number = parseInt(text, 10);
    if (isNaN(number)) {
        return null;
    }
    return number;
}

function splitList(value: unknown): string[] {
    const text = readQueryString(value);
    if (!text) {
        return [];
    }
    const items = [];
    for (const part of text.split(',')) {
        items.push(part.trim().toLowerCase());
    }
    return items;
}

export class SearchService {
    static async search(query: ParsedQs): Promise<SearchResponse> {
        const cacheKey = SearchService.buildCacheKey(query);
        const cached = await Cache.getJson<SearchResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const filters = SearchService.parseFilters(query);
        const rows = await BeatmapsetRepository.search(filters);

        const beatmapsets = [];
        if (rows.length > 0) {
            const ids = [];
            for (const row of rows) {
                ids.push(row.id);
            }
            const beatmapRows = await BeatmapRepository.getByBeatmapsetIds(ids);

            const beatmapsBySet = new Map<string, BeatmapRow[]>();
            for (const beatmapRow of beatmapRows) {
                const setId = String(beatmapRow.beatmapset_id);
                if (!beatmapsBySet.has(setId)) {
                    beatmapsBySet.set(setId, []);
                }
                beatmapsBySet.get(setId)!.push(beatmapRow);
            }

            for (const row of rows) {
                const beatmaps = beatmapsBySet.get(String(row.id)) ?? [];
                beatmapsets.push(BeatmapsetView.render(row, beatmaps));
            }
        }

        const response = { beatmapsets };
        await Cache.setJson(cacheKey, response, Environment.env.REDIS_CACHE_TIME);
        return response;
    }

    // same params in any order share a cache key
    private static buildCacheKey(query: ParsedQs): string {
        const keys = Object.keys(query).sort();
        const parts = [];
        for (const key of keys) {
            parts.push(`${key}=${query[key]}`);
        }
        return `search:${parts.join('&')}`;
    }

    private static parseFilters(query: ParsedQs): SearchFilters {
        let text: string | null = null;
        const q = readQueryString(query.q);
        if (q) {
            text = q;
        }

        const statuses = [];
        for (const status of splitList(query.status)) {
            if (VALID_STATUSES.includes(status)) {
                statuses.push(status);
            }
        }

        // fruits and catch are the same column
        const modeColumns = new Set<string>();
        for (const mode of splitList(query.mode)) {
            const column = MODE_COLUMNS.get(mode);
            if (column) {
                modeColumns.add(column);
            }
        }

        let video: boolean | null = null;
        if (query.video === 'true') {
            video = true;
        }
        if (query.video === 'false') {
            video = false;
        }

        const beatmapRanges: BeatmapRange[] = [];
        for (const [param, column, operator] of BEATMAP_RANGE_PARAMS) {
            const value = parseFloatOrNull(query[param]);
            if (value !== null) {
                beatmapRanges.push({ column, operator, value });
            }
        }

        let sortColumn = 'last_updated';
        const sort = readQueryString(query.sort);
        if (sort !== undefined && SORT_COLUMNS.has(sort)) {
            sortColumn = SORT_COLUMNS.get(sort)!;
        }

        let sortDirection: 'ASC' | 'DESC' = 'DESC';
        if (query.order === 'asc') {
            sortDirection = 'ASC';
        }

        let page = parseIntOrNull(query.page) ?? 1;
        if (page < 1) {
            page = 1;
        }

        return {
            text,
            beatmapsetId: parseIntOrNull(query.id),
            beatmapId: parseIntOrNull(query.map_id),
            statuses,
            modeColumns: Array.from(modeColumns),
            video,
            bpmMin: parseFloatOrNull(query.bpm_min),
            bpmMax: parseFloatOrNull(query.bpm_max),
            beatmapRanges,
            sortColumn,
            sortDirection,
            page,
        };
    }
}