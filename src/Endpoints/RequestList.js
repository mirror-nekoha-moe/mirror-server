import { app, pool } from '../Constants.js';

/**
 * @api {get} /api4/request List all beatmap requests
 * @apiName listRequests
 * @apiGroup Request
 */
app.get('/api4/request', async (req, res) => {
    try {
        const result = await pool.query(
            `
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
                LIMIT 1000;
            `
        );
        res.json(result.rows);

    } catch (err) {
        console.error('List requests error:', err);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});