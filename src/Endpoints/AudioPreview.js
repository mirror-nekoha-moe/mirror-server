import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { app, pool, yauzl } from '../Constants.js';
import crypto from 'crypto';

const PREVIEW_CACHE_BEATMAP_DIR = process.env.PREVIEW_CACHE_BEATMAP_DIR;
const PREVIEW_CACHE_BEATMAPSET_DIR = process.env.PREVIEW_CACHE_BEATMAPSET_DIR;
const AUDIO_PREVIEW_BITRATE = process.env.AUDIO_PREVIEW_BITRATE;
const AUDIO_PREVIEW_LENGTH = process.env.AUDIO_PREVIEW_LENGTH;

function getBeatmapSetting(osuFileContent, field) {
    const regex = new RegExp(`^${field}:\\s*(.+)$`, 'm');
    const match = osuFileContent.match(regex);
    return match ? match[1].trim() : null;
}
function readAllOsuFiles(filePath) {
    return new Promise((resolve, reject) => {
        yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
            if (err || !zipfile)
                return reject(err || new Error('Failed to open zip'));
            const osuFiles = [];
            zipfile.readEntry();
            zipfile.on('entry', entry => {
                const isDirectory = /\/$/.test(entry.fileName);
                if (isDirectory || !entry.fileName.toLowerCase().endsWith('.osu')) {
                    zipfile.readEntry();
                    return;
                }
                zipfile.openReadStream(entry, (err, readStream) => {
                    if (err || !readStream) {
                        zipfile.readEntry();
                        return;
                    }
                    const chunks = [];
                    readStream.on('data', c => chunks.push(c));
                    readStream.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        osuFiles.push({
                            name: entry.fileName,
                            buffer,
                            text: buffer.toString('utf-8'),
                            md5: crypto.createHash('md5').update(buffer).digest('hex')
                        });
                        zipfile.readEntry();
                    });
                    readStream.on('error', () => zipfile.readEntry());
                });
            });
            zipfile.on('end', () => resolve(osuFiles));
            zipfile.on('error', reject);
        });
    });
}
function getAudioStream(filePath, targetFileName, destination) {
    return new Promise((resolve, reject) => {
        yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
            if (err || !zipfile) {
                return reject(err || new Error('Failed to open zip'));
            }

            let found = false;
            zipfile.readEntry();
            zipfile.on('entry', entry => {
                if (entry.fileName !== targetFileName) {
                    zipfile.readEntry();
                    return;
                }

                found = true;
                zipfile.openReadStream(entry, (err, readStream) => {
                    if (err || !readStream) {
                        zipfile.close();
                        return reject(err);
                    }
                    readStream.pipe(destination, { end: true });
                    readStream.on('end', () => {
                        zipfile.close();
                        resolve(true);
                    });
                    readStream.on('error', reject);
                });
            });
            zipfile.on('end', () => { if (!found) resolve(false); });
            zipfile.on('error', reject);
        });
    });
}
async function locateBeatmapAudio(oszPath, beatmap) {
    const osuFiles = await readAllOsuFiles(oszPath);

    let thisOsu = osuFiles.find(f => {
        const beatmapId = getBeatmapSetting(f.text, 'BeatmapID');
        return beatmapId && parseInt(beatmapId, 10) === parseInt(beatmap.id, 10);
    });

    // compare beatmap hash
    if (!thisOsu && beatmap.checksum) {
        thisOsu = osuFiles.find(f => f.md5 === beatmap.checksum);
    }

    if (!thisOsu)
        return null;

    const audioFile = getBeatmapSetting(thisOsu.text, 'AudioFilename');
    const previewTimeMs = parseInt(getBeatmapSetting(thisOsu.text, 'PreviewTime') ?? '-1', 10);
    if (!audioFile)
        return null;

    const distinctAudioFiles = new Set(osuFiles.map(f => getBeatmapSetting(f.text, 'AudioFilename')).filter(Boolean));
    const isSharedAudio = distinctAudioFiles.size <= 1;

    return {
        audioFile,
        previewTimeMs,
        isSharedAudio
    };
}
async function getOszPath(beatmap) {
    const folder = path.join(process.env.STORAGE_DIR, String(beatmap.beatmapset_id));

    if (!fs.existsSync(folder))
        return null;

    const oszFile = fs.readdirSync(folder)
        .filter(f => f.endsWith('.osz'))
        .sort((a, b) => fs.statSync(path.join(folder, b)).size - fs.statSync(path.join(folder, a)).size)[0];
    return oszFile ? path.join(folder, oszFile) : null;
}

/**
 * @api {get} /api/beatmap/:id/preview Get beatmap audio preview
 * @apiName beatmap-preview
 * @apiDescription Get beatmap audio preview
 */
app.get('/api/beatmap/:id/preview', async (req, res) => {
    try {
        const numericId = parseInt(req.params.id, 10);
        if (isNaN(numericId) || numericId < 0) {
            return res.status(400).json({
                error: 'Invalid beatmap ID'
            });
        } 

        // check if we have the beatmap in the database
        const result = await pool.query(
            `SELECT * FROM ${process.env.TABLE_BEATMAP} WHERE id = $1`,
            [numericId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Beatmap not found'
            });
        }

        // beatmap table row
        const beatmap = result.rows[0];

        // check if we have the beatmapset downloaded
        const resultBeatmapset = await pool.query(
            `SELECT * FROM ${process.env.TABLE_BEATMAPSET} WHERE id = $1`,
            [beatmap.beatmapset_id]
        );
        if (resultBeatmapset.rows.length === 0 || resultBeatmapset.rows[0].downloaded === false) {
            return res.status(404).json({
                error: 'Beatmapset not found or not downloaded.'
            });
        }

        // assume shared audio, check before touching the zip at all
        const setCachePath = path.join(PREVIEW_CACHE_BEATMAPSET_DIR, `${beatmap.beatmapset_id}.mp3`);
        if (fs.existsSync(setCachePath)) {
            res.setHeader('Content-Type', 'audio/mpeg');
            return fs.createReadStream(setCachePath).pipe(res);
        }

        // also check per-beatmap cache in case this, beatmapset was already determined to be multi-audio
        const beatmapCachePath = path.join(PREVIEW_CACHE_BEATMAP_DIR, `${beatmap.id}.mp3`);
        if (fs.existsSync(beatmapCachePath)) {
            res.setHeader('Content-Type', 'audio/mpeg');
            return fs.createReadStream(beatmapCachePath).pipe(res);
        }

        // neither cache hit, inspect the archive
        const oszPath = await getOszPath(beatmap);
        if (!oszPath) {
            return res.status(404).json({ error: 'Beatmapset .osz not found' });
        } 

        const audioInfo = await locateBeatmapAudio(oszPath, beatmap);
        if (!audioInfo) {
            return res.status(404).json({ error: '.osu file or AudioFilename not found' });
        }

        const cachePath = audioInfo.isSharedAudio ? setCachePath : beatmapCachePath;
        const cacheDir = path.dirname(cachePath);
        fs.mkdirSync(cacheDir, { recursive: true });

        const startSeconds = audioInfo.previewTimeMs >= 0 ? audioInfo.previewTimeMs / 1000 : 0;

        const ffmpeg = spawn('ffmpeg', [
            '-y',
            '-ss', String(startSeconds),
            '-i', 'pipe:0',
            '-t', String(AUDIO_PREVIEW_LENGTH),
            '-acodec', 'libmp3lame',
            '-b:a', String(AUDIO_PREVIEW_BITRATE),
            cachePath
        ]);

        ffmpeg.on('error', err => {
            console.error('ffmpeg spawn error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to generate preview' });
            }
        });

        ffmpeg.on('close', code => {
            if (code !== 0) {
                console.error('ffmpeg exited with code', code);
                if (!res.headersSent) {
                    return res.status(500).json({ error: 'Failed to generate preview' });
                }
                return;
            }
            res.setHeader('Content-Type', 'audio/mpeg');
            fs.createReadStream(cachePath).pipe(res);
        });

        const found = await getAudioStream(oszPath, audioInfo.audioFile, ffmpeg.stdin);
        if (!found) {
            ffmpeg.kill();
            return res.status(404).json({ error: 'Audio file not found' });
        }
    } catch (err) {
        console.error('preview generation error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate preview' });
        }
    }
});