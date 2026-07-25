import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app, pool, yauzl } from '../Constants.js';

function extractBeatmapId(osuFileText) {
    const match = osuFileText.match(/^BeatmapID:\s*(\d+)/m);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * @api {get} /api/osu/:id Get .osu file for a beatmap
 * @apiName osu-file
 * @apiGroup File
 * @apiDescription Returns the raw .osu file content for a beatmap.
 * @apiParam {Number} id Beatmap ID
 * @apiSuccess {String} - Raw .osu file content (text/plain)
 * @apiError 400 Invalid beatmap ID (must be a positive number)
 * @apiError 404 .osu file not found for this beatmap
 * @apiError 500 Invalid or corrupted zip archive
 * @apiError 500 Internal server error
 * @apiExample {curl} Basic request:
 *     curl -X GET https://mirror.nekoha.moe/api/osu/4753900
 */
app.get('/api/osu/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const numericId = parseInt(id, 10);

        if (isNaN(numericId) || numericId < 0) {
            return res.status(400).json({ error: 'Invalid beatmap ID' });
        }

        const result = await pool.query(
            `SELECT * FROM ${process.env.TABLE_BEATMAP} WHERE id = $1`,
            [numericId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Beatmap not found' });
        }

        const folder = path.join(process.env.STORAGE_DIR, String(result.rows[0].beatmapset_id));

        if (!fs.existsSync(folder) || !fs.lstatSync(folder).isDirectory()) {
            return res.status(404).json({ error: 'Beatmapset folder not found' });
        }

        // Get largest .osz file
        const files = fs.readdirSync(folder);
        const oszFile = files.filter(f => f.endsWith('.osz')).sort((a, b) => 
            fs.statSync(path.join(folder, b)).size - fs.statSync(path.join(folder, a)).size
        )[0];

        if (!oszFile) {
            return res.status(404).json({ error: 'No .osz file found' });
        }

        const filePath = path.join(folder, oszFile);

        yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
            if (err || !zipfile) {
                return res.status(500).json({ error: 'Invalid or corrupted zip archive' });
            }

            const osuEntries = [];
            let responded = false;

            zipfile.readEntry();
            zipfile.on('entry', entry => {
                const isDirectory = /\/$/.test(entry.fileName);

                if (isDirectory || !entry.fileName.endsWith('.osu')) {
                    zipfile.readEntry();
                    return;
                }

                zipfile.openReadStream(entry, (err, readStream) => {
                    if (err || !readStream) {
                        zipfile.readEntry();
                        return;
                    }

                    const chunks = [];
                    readStream.on('data', chunk => chunks.push(chunk));
                    readStream.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        const md5 = crypto.createHash('md5').update(buffer).digest('hex');
                        osuEntries.push({
                            buffer,
                            md5,
                            name: entry.fileName
                        });
                        zipfile.readEntry();
                    });
                    readStream.on('error', () => {
                        zipfile.readEntry();
                    });
                });
            });

            zipfile.on('end', () => {
                if (responded)
                    return;

                // check md5 hash
                let match = osuEntries.find(e => e.md5 === result.rows[0].checksum);

                // get BeatmapID inside .osu file
                if (!match) {
                    match = osuEntries.find(e => {
                        const text = e.buffer.toString('utf-8');
                        return extractBeatmapId(text) === numericId;
                    });
                }

                if (match) {
                    responded = true;
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    return res.send(match.buffer);
                }

                res.status(404).json({ error: '.osu file not found for this beatmap' });
            });

            zipfile.on('error', err => {
                console.error('zip read error:', err);
                if (!responded) {
                    responded = true;
                    res.status(500).json({ error: 'Invalid or corrupted zip archive' });
                }
            });
        });

    } catch (err) {
        console.error('osu file fetch error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});