import { Database } from '@Core/Database/Connection';
import { DbNumber } from '@Model/BeatmapsetModel';
import { RequestItemInput, RequestBatchRow, RequestBatchSummaryRow, RequestItemRow } from '@Model/RequestModel';

export class RequestRepository {
    static async createBatch(items: RequestItemInput[]): Promise<DbNumber> {
        // transaction needs its own client
        const client = await Database.connect();
        try {
            await client.query('BEGIN');

            const batchResult = await client.query<{ id: DbNumber }>(`
                INSERT INTO request_batch (status)
                VALUES ('pending')
                RETURNING id
            `);
            const batchId = batchResult.rows[0].id;

            for (const item of items) {
                await client.query(`
                    INSERT INTO request_item
                    (batch_id, type, beatmapset_id, beatmapset_url, osz_url, notes)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    batchId,
                    item.type,
                    item.beatmapsetId,
                    item.beatmapsetUrl,
                    item.oszUrl,
                    item.notes || null,
                ]);
            }

            await client.query('COMMIT');
            return batchId;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async getBatch(id: number): Promise<RequestBatchRow | null> {
        const res = await Database.query<RequestBatchRow>(`
            SELECT id, status, created_at
            FROM request_batch
            WHERE id = $1
        `, [id]);
        return res.rows[0] ?? null;
    }

    static async getItems(batchId: number): Promise<RequestItemRow[]> {
        const res = await Database.query<RequestItemRow>(`
            SELECT
                id,
                type,
                beatmapset_id,
                beatmapset_url,
                osz_url,
                notes
            FROM request_item
            WHERE batch_id = $1
            ORDER BY id ASC
        `, [batchId]);
        return res.rows;
    }

    static async listBatches(): Promise<RequestBatchSummaryRow[]> {
        const res = await Database.query<RequestBatchSummaryRow>(`
            SELECT
                b.id,
                b.status,
                b.created_at,
                (
                    SELECT COUNT(*)
                    FROM request_item i
                    WHERE i.batch_id = b.id
                )::int AS item_count
            FROM request_batch b
            ORDER BY b.id DESC
            LIMIT 1000
        `);
        return res.rows;
    }
}