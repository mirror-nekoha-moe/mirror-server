import { Database } from '@Core/Database/Connection';
import { Environment } from '@Bootstrap/Environment';
import { StatsRow, DownloadStatsRow, ApiCallRow } from '@Model/StatsModel';

export class StatsRepository {
    static async getStats(): Promise<StatsRow | null> {
        const res = await Database.query<StatsRow>(`SELECT * FROM ${Environment.env.TABLE_STATS}`);
        return res.rows[0] ?? null;
    }

    static async getDailyDownloads(days: number): Promise<DownloadStatsRow[]> {
        const res = await Database.query<DownloadStatsRow>(`
            SELECT day, downloads, bytes_sent
            FROM download_stats
            WHERE day >= CURRENT_DATE - ($1 || ' days')::interval
            ORDER BY day ASC
        `, [days]);
        return res.rows;
    }

    static async recordDownload(bytes: number): Promise<void> {
        await Database.query(`
            INSERT INTO download_stats (day, downloads, bytes_sent)
            VALUES (CURRENT_DATE, 1, $1)
            ON CONFLICT (day) DO UPDATE
                SET downloads  = download_stats.downloads  + 1,
                    bytes_sent = download_stats.bytes_sent + $1
        `, [bytes]);
    }

    // beatmap-fetcher writes and prunes these
    static async getApiCallsV1(since: Date): Promise<ApiCallRow[]> {
        const res = await Database.query<ApiCallRow>(
            `SELECT minute, calls FROM api_calls_v1 WHERE minute >= $1 ORDER BY minute ASC`,
            [since]
        );
        return res.rows;
    }

    static async getApiCallsV2(since: Date): Promise<ApiCallRow[]> {
        const res = await Database.query<ApiCallRow>(
            `SELECT minute, calls FROM api_calls_v2 WHERE minute >= $1 ORDER BY minute ASC`,
            [since]
        );
        return res.rows;
    }
}