import { app, pool } from '../Constants.js';

/**
 * @api {post} /api4/request Create beatmap request batch
 * @apiName createRequest
 * @apiGroup Request
 */
app.post('/api4/request', async (req, res) => {
    const client = await pool.connect();

    let transactionStarted = false;
    try {
        const items = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Invalid request payload' });
        }

        if (items.length > 100) {
            return res.status(400).json({ error: 'You can request a maximum of 100 maps at once' });
        }

        const isValidUrl = (value) => {
            try {
                const url = new URL(value);
                return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname;
            } catch {
                return false;
            }
        };

        const isNonEmptyString = (v) =>
            typeof v === 'string' && v.trim().length > 0;

        const isValidType = (v) =>
            v === 'new' || v === 'update';

        for (const item of items) {
            // type validation
            if (!isNonEmptyString(item.type) || !isValidType(item.type)) {
                return res.status(400).json({ error: 'invalid type' });
            }

            // beatmapsetId validation
            const idNum = Number(item.beatmapsetId);
            if (
                item.beatmapsetId === undefined ||
                item.beatmapsetId === null ||
                item.beatmapsetId === '' ||
                !Number.isInteger(idNum) ||
                idNum < 0
            ) {
                return res.status(400).json({ error: 'beatmapsetId must be a valid integer' });
            }

            // URLs
            if (!isNonEmptyString(item.beatmapsetUrl) || !isValidUrl(item.beatmapsetUrl)) {
                return res.status(400).json({ error: 'invalid beatmapsetUrl' });
            }

            if (!isNonEmptyString(item.oszUrl) || !isValidUrl(item.oszUrl)) {
                return res.status(400).json({ error: 'invalid oszUrl' });
            }

            // notes optional but normalize
            if (item.notes != null && typeof item.notes !== 'string') {
                return res.status(400).json({ error: 'notes must be a string' });
            }
        }
        await client.query('BEGIN');
        transactionStarted = true;
        
        const batchResult = await client.query(
            `INSERT INTO request_batch (status)
             VALUES ('pending')
             RETURNING id`
        );

        const batchId = batchResult.rows[0].id;

        const insertItemQuery = `
            INSERT INTO request_item
            (batch_id, type, beatmapset_id, beatmapset_url, osz_url, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;

        for (const item of items) {
            await client.query(insertItemQuery, [
                batchId,
                item.type,
                item.beatmapsetId,
                item.beatmapsetUrl,
                item.oszUrl,
                item.notes || null
            ]);
        }

        await client.query('COMMIT');

        // non-blocking
        sendWebhook(batchId).catch(console.error);

        res.json({
            requestId: batchId,
            status: 'pending'
        });

    } catch (err) {
        if (transactionStarted) {
            await client.query('ROLLBACK');
        }
        console.error('Create request error:', err);
        res.status(500).json({ error: 'Failed to create request' });
    } finally {
        client.release();
    }
});

async function sendWebhook(batchId) {
    const url = process.env.DISCORD_REQUEST_WEBHOOK_URL;
    if (!url) return;

    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            embeds: [
                {
                    title: 'New Beatmap Request',
                    description:
                        `Request ID: ${batchId}\n` +
                        `Status: pending\n` +
                        `View: https://${process.env.DOMAIN}/request/status/${batchId}`,
                    color: 0xFF0000
                }
            ]
        })
    });
}