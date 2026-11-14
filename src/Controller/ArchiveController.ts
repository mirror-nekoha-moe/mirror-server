import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { Request, Response } from 'express';
import { Environment } from '@Bootstrap/Environment';
import { parseRange, sendError } from '@Core/Http/Http';
import { ArchiveService } from '@Service/ArchiveService';
import { DownloadService } from '@Service/DownloadService';

const ARCHIVE_MODES = ['std', 'taiko', 'catch', 'mania'];

export class ArchiveController {
    /**
     * @api {get} /api/archive Get monthly archives
     * @apiName archive
     * @apiGroup Archive
     * @apiDescription Returns all monthly archives. One zip per month and mode with every ranked, approved and loved beatmapset ranked in that month (UTC). Cached in Redis.
     * @apiSuccess {Object[]} archives
     * @apiSuccess {String}   archives.month            Month (YYYY-MM)
     * @apiSuccess {String}   archives.mode             std, taiko, catch or mania
     * @apiSuccess {String}   archives.file_name        Zip file name
     * @apiSuccess {Number}   archives.size_gb          Size in GB
     * @apiSuccess {Number}   archives.beatmapset_count Beatmapsets in the zip
     * @apiSuccess {String}   archives.created_at       ISO date when the zip was built
     * @apiSuccess {String}   archives.url              Download URL
     * @apiError 500 Internal server error
     * @apiExample {curl} Example usage:
     *     curl https://mirror.nekoha.moe/api/archive
     */
    static async listArchives(req: Request, res: Response): Promise<void> {
        const archives = await ArchiveService.getArchives();
        res.json(archives);
    }

    /**
     * @api {get} /api/archive/:year/:month/:mode Download a monthly archive
     * @apiName archive-download
     * @apiGroup Archive
     * @apiDescription Streams the zip. Downloads can be paused and resumed.
     * @apiParam {String} year  Year (YYYY)
     * @apiParam {String} month Month (MM)
     * @apiParam {String} mode  std, taiko, catch or mania
     * @apiSuccess {File} .zip The archive (application/zip)
     * @apiError 400 Invalid year, month or mode
     * @apiError 404 Archive not found
     * @apiError 500 Internal server error
     * @apiExample {curl} Example usage:
     *     curl -OJ https://mirror.nekoha.moe/api/archive/2015/05/std
     */
    static async downloadArchive(req: Request, res: Response): Promise<void> {
        const year = req.params.year;
        const month = req.params.month;
        const mode = req.params.mode;

        const validYear = /^\d{4}$/.test(year);
        const validMonth = /^(0[1-9]|1[0-2])$/.test(month);
        const validMode = ARCHIVE_MODES.includes(mode);
        if (!validYear || !validMonth || !validMode) {
            sendError(res, 400, 'Invalid archive');
            return;
        }

        const archive = await ArchiveService.getArchive(`${year}-${month}`, mode);
        if (!archive) {
            sendError(res, 404, 'Archive not found');
            return;
        }

        const filePath = path.join(Environment.env.ARCHIVE_DIR, year, month, archive.file_name);
        const fileStat = await fsp.stat(filePath).catch(() => null);
        if (!fileStat) {
            sendError(res, 404, 'Archive file not found in storage');
            return;
        }

        const size = fileStat.size;
        const lastModified = fileStat.mtime.toUTCString();
        const etag = `"${size}-${fileStat.mtime.getTime()}"`;

        let range = parseRange(req.headers.range, size);
        const ifRange = req.headers['if-range'];
        if (ifRange && ifRange !== etag && ifRange !== lastModified) {
            range = null;
        }

        let start = 0;
        let end = size - 1;
        if (range) {
            if (range.start > range.end) {
                res.setHeader('Content-Range', `bytes */${size}`);
                sendError(res, 416, 'Range not satisfiable');
                return;
            }
            start = range.start;
            end = range.end;
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
        }
        const length = end - start + 1;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${archive.file_name}"`);
        res.setHeader('Content-Length', length);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Last-Modified', lastModified);
        res.setHeader('ETag', etag);

        const chunkSize = Environment.env.STREAM_CHUNK_SIZE_KB * 1024;
        const fileStream = fs.createReadStream(filePath, { start, end, highWaterMark: chunkSize });
        fileStream.on('open', () => fileStream.pipe(res));
        fileStream.on('error', (err) => {
            console.error('Error streaming archive:', err);
            if (res.headersSent) {
                res.destroy(err);
                return;
            }
            sendError(res, 500, 'Failed to stream archive');
        });
        res.on('close', () => {
            // resumed downloads aren't counted
            if (!range && fileStream.bytesRead >= size) {
                DownloadService.recordDownload(size);
            }
            fileStream.destroy();
        });
    }
}