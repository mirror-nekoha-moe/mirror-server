import { Database } from '@Core/Database/Connection';
import { Environment } from '@Bootstrap/Environment';
import { BeatmapsetRow, OszSizeRow, SearchFilters } from '@Model/BeatmapsetModel';

const SEARCH_PAGE_SIZE = 100;
const TEXT_SEARCH_COLUMNS = ['title', 'artist', 'creator', 'tags', 'source'];

export class BeatmapsetRepository {
    static async getById(id: number): Promise<BeatmapsetRow | null> {
        const res = await Database.query<BeatmapsetRow>(
            `SELECT * FROM ${Environment.env.TABLE_BEATMAPSET} WHERE id = $1`,
            [id]
        );
        return res.rows[0] ?? null;
    }

    static async getOszSize(id: number): Promise<OszSizeRow | null> {
        const res = await Database.query<OszSizeRow>(
            `SELECT id, file_size FROM ${Environment.env.TABLE_BEATMAPSET} WHERE id = $1`,
            [id]
        );
        return res.rows[0] ?? null;
    }

    static async getAllOszSizes(): Promise<OszSizeRow[]> {
        const res = await Database.query<OszSizeRow>(
            `SELECT id, file_size FROM ${Environment.env.TABLE_BEATMAPSET}`
        );
        return res.rows;
    }

    static async search(filters: SearchFilters): Promise<BeatmapsetRow[]> {
        const beatmapsetTable = Environment.env.TABLE_BEATMAPSET;
        const beatmapTable = Environment.env.TABLE_BEATMAP;

        const where = ['downloaded = true'];
        const values: unknown[] = [];

        const addParam = (value: unknown): string => {
            values.push(value);
            return `$${values.length}`;
        };

        if (filters.text !== null) {
            const placeholder = addParam(`%${filters.text}%`);
            const textClauses = [];
            for (const column of TEXT_SEARCH_COLUMNS) {
                textClauses.push(`${column} ILIKE ${placeholder}`);
            }
            where.push(`(${textClauses.join(' OR ')})`);
        }

        if (filters.beatmapsetId !== null) {
            where.push(`id = ${addParam(filters.beatmapsetId)}`);
        }

        if (filters.statuses.length > 0) {
            where.push(`status = ANY(${addParam(filters.statuses)})`);
        }

        if (filters.modeColumns.length > 0) {
            const modeClauses = [];
            for (const column of filters.modeColumns) {
                modeClauses.push(`${column} > 0`);
            }
            where.push(`(${modeClauses.join(' OR ')})`);
        }

        if (filters.video === true) {
            where.push('video = true');
        }
        if (filters.video === false) {
            where.push('(video = false OR video IS NULL)');
        }

        if (filters.bpmMin !== null) {
            where.push(`bpm >= ${addParam(filters.bpmMin)}`);
        }
        if (filters.bpmMax !== null) {
            where.push(`bpm <= ${addParam(filters.bpmMax)}`);
        }

        // all difficulty filters have to hit the same beatmap
        const beatmapFilters = [];
        for (const range of filters.beatmapRanges) {
            beatmapFilters.push(`bm.${range.column} ${range.operator} ${addParam(range.value)}`);
        }
        if (filters.beatmapId !== null) {
            beatmapFilters.push(`bm.id = ${addParam(filters.beatmapId)}`);
        }
        if (beatmapFilters.length > 0) {
            where.push(`EXISTS (
                SELECT 1 FROM ${beatmapTable} bm
                WHERE bm.beatmapset_id = ${beatmapsetTable}.id AND ${beatmapFilters.join(' AND ')}
            )`);
        }

        const offset = (filters.page - 1) * SEARCH_PAGE_SIZE;
        const query = `
            SELECT * FROM ${beatmapsetTable}
            WHERE ${where.join(' AND ')}
            ORDER BY ${filters.sortColumn} ${filters.sortDirection}
            LIMIT ${SEARCH_PAGE_SIZE} OFFSET ${offset}
        `;

        const res = await Database.query<BeatmapsetRow>(query, values);
        return res.rows;
    }
}