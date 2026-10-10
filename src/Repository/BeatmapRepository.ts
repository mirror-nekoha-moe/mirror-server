import { Database } from '@Core/Database/Connection';
import { Environment } from '@Bootstrap/Environment';
import { BeatmapRow } from '@Model/BeatmapModel';
import { DbNumber } from '@Model/BeatmapsetModel';

export class BeatmapRepository {
    static async getById(id: number): Promise<BeatmapRow | null> {
        const res = await Database.query<BeatmapRow>(
            `SELECT * FROM ${Environment.env.TABLE_BEATMAP} WHERE id = $1`,
            [id]
        );
        return res.rows[0] ?? null;
    }

    static async getByBeatmapsetId(beatmapsetId: number): Promise<BeatmapRow[]> {
        const res = await Database.query<BeatmapRow>(
            `SELECT * FROM ${Environment.env.TABLE_BEATMAP} WHERE beatmapset_id = $1`,
            [beatmapsetId]
        );
        return res.rows;
    }

    static async getByBeatmapsetIds(beatmapsetIds: DbNumber[]): Promise<BeatmapRow[]> {
        const res = await Database.query<BeatmapRow>(
            `SELECT * FROM ${Environment.env.TABLE_BEATMAP} WHERE beatmapset_id = ANY($1)`,
            [beatmapsetIds]
        );
        return res.rows;
    }
}