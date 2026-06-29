import { app, pool } from '../Constants.js';

/**
 * @api {get} /api4/request/:id Get full request details
 * @apiName getRequest
 * @apiGroup Request
 * @apiParam {Number} id request ID, 
 */
app.get('/api4/request/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ error: 'Invalid request id' });
        }

        const batchResult = await pool.query(
            `
            SELECT id, status, created_at
            FROM request_batch
            WHERE id = $1
            `,
            [id]
        );

        if (batchResult.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const itemsResult = await pool.query(
            `
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
            `,
            [id]
        );

        res.json({
            id: batchResult.rows[0].id,
            status: batchResult.rows[0].status,
            created_at: batchResult.rows[0].created_at,
            items: itemsResult.rows
        });

    } catch (err) {
        console.error('Get request error:', err);
        res.status(500).json({ error: 'Failed to fetch request' });
    }
});