import fs from 'fs';
import { Request, Response } from 'express';
import { Environment } from '@Bootstrap/Environment';
import { parseId, sendError } from '@Core/Http/Http';
import { toNum } from '@View/Format';
import { BeatmapsetRepository } from '@Repository/BeatmapsetRepository';
import { BeatmapRepository } from '@Repository/BeatmapRepository';
import { StorageService } from '@Service/StorageService';
import { OszService, OsuFile } from '@Service/OszService';
import { DownloadService } from '@Service/DownloadService';

function findBeatmapId(osuFile: OsuFile): number | null {
    const match = osuFile.buffer.toString('utf-8').match(/^BeatmapID:\s*(\d+)/m);
    if (!match) {
        return null;
    }
    return parseInt(match[1], 10);
}

export class FileController {
    /**
     * @api {get} /api/download/:id Download a beatmapset (.osz file)
     * @apiName download
     * @apiGroup File
     * @apiDescription Streams the .osz archive for the given beatmapset. If the beatmapset has a video and noVideo=1 is passed, the video files are stripped on-the-fly via zip repacking (yauzl + archiver). If the beatmapset has no video, the noVideo param is ignored and the file is streamed directly.
     * @apiParam {Number} id Beatmapset ID
     * @apiQuery {String} [noVideo=0] Pass noVideo=1 to strip video files from the .osz (only applied when the beatmapset actually has a video)
     * @apiSuccess {File} .osz The beatmapset archive file (application/x-osu-beatmap-archive)
     * @apiError 400 Invalid beatmapset ID (must be a positive number)
     * @apiError 404 Beatmapset not found (not yet downloaded), or folder/.osz is missing
     * @apiError 410 Beatmapset unavailable (missing audio/DMCA takedown, NOTIFY ME TO FIX THIS SET)
     * @apiError 500 Internal server error, or archive/repack failure
     * @apiExample {curl} Download with video (default):
     *     curl -OJ https://mirror.nekoha.moe/api/download/12345
     * @apiExample {curl} Download without video:
     *     curl -OJ "https://mirror.nekoha.moe/api/download/12345?noVideo=1"
     */
    static async download(req: Request, res: Response): Promise<void> {
        const id = parseId(req.params.id);
        if (id === null) {
            sendError(res, 400, 'Invalid beatmapset ID. Must be a positive number.');
            return;
        }

        const beatmapset = await BeatmapsetRepository.getById(id);
        if (!beatmapset) {
            sendError(res, 404, 'Beatmapset not found');
            return;
        }
        if (!beatmapset.downloaded) {
            sendError(res, 404, 'Beatmapset not downloaded yet');
            return;
        }
        if (beatmapset.missing_audio) {
            sendError(res, 410, 'Beatmapset missing (not available for download)\nContact me to upload this mapset.');
            return;
        }
        if (beatmapset.dmca) {
            sendError(res, 410, 'Beatmapset missing (dmca takedown)\nContact me to upload this mapset.');
            return;
        }

        const osz = await StorageService.findOsz(id);
        if (osz.status === 'missing-folder') {
            sendError(res, 404, 'Beatmapset folder not found in storage');
            return;
        }
        if (osz.status === 'missing-osz') {
            sendError(res, 404, 'Beatmapset .osz file not found in folder');
            return;
        }

        res.setHeader('Content-Type', 'application/x-osu-beatmap-archive');
        res.setHeader('Content-Disposition', `attachment; filename="${id}.osz"`);

        // noVideo still counts the full stored size
        const storedSize = toNum(beatmapset.file_size) ?? 0;

        // Only attempt video stripping if the map actually has a video
        const stripVideo = req.query.noVideo === '1' && beatmapset.video === true;
        if (stripVideo) {
            res.on('finish', () => DownloadService.recordDownload(storedSize));
            FileController.sendWithoutVideo(osz.filePath, res);
            return;
        }

        res.setHeader('Content-Length', osz.size);

        const chunkSize = Environment.env.STREAM_CHUNK_SIZE_KB * 1024;
        const fileStream = fs.createReadStream(osz.filePath, { highWaterMark: chunkSize });
        fileStream.on('open', () => fileStream.pipe(res));
        fileStream.on('error', (err) => {
            console.error('Error streaming file:', err);
            if (res.headersSent) {
                res.destroy(err);
                return;
            }
            sendError(res, 500, 'Failed to stream beatmapset file');
        });
        res.on('close', () => {
            // clients hang up at Content-Length before 'finish' fires
            if (fileStream.bytesRead >= osz.size) {
                DownloadService.recordDownload(storedSize);
            }
            fileStream.destroy();
        });
    }

    /**
     * @api {get} /api/osz/:id/content Get .osz archive contents
     * @apiName osz-content
     * @apiGroup File
     * @apiDescription Returns json of files inside .osz archive.
     * @apiParam {Number} id Beatmapset ID
     * @apiSuccess {Number} id Beatmapset ID
     * @apiSuccess {String} file Name of the .osz file
     * @apiSuccess {Object[]} entries List of archive entries
     * @apiSuccess {String} entries.name File path inside archive
     * @apiSuccess {Boolean} entries.directory Whether entry is a directory
     * @apiSuccess {Number} entries.compressedSizeBytes Size of compressed data in bytes
     * @apiSuccess {Number} entries.uncompressedSizeBytes Size after extraction in bytes
     * @apiSuccess {Number} entries.crc32 CRC32 checksum of entry
     * @apiSuccess {Number} entries.version ZIP version required to extract entry
     *
     * @apiError 400 Invalid beatmapset ID (must be a positive number)
     * @apiError 404 Beatmapset not found or no .osz file exists
     * @apiError 500 Invalid or corrupted ZIP archive, or internal server error
     *
     * @apiExample {curl} Basic request:
     *     curl -X GET https://mirror.nekoha.moe/api/osz/12345/content
     *
     * @apiSuccessExample {json} Success response:
     * {
     *   "id": 12345,
     *   "file": "song.osz",
     *   "entries": [
     *     {
     *       "name": "Audio.mp3",
     *       "directory": false,
     *       "compressedSizeBytes": 1234567,
     *       "uncompressedSizeBytes": 2345678,
     *       "crc32": 123456789,
     *       "version": 20
     *     }
     *   ]
     * }
     */
    static async getOszContent(req: Request, res: Response): Promise<void> {
        const id = parseId(req.params.id);
        if (id === null) {
            sendError(res, 400, 'Invalid beatmapset ID');
            return;
        }

        const beatmapset = await BeatmapsetRepository.getById(id);
        if (!beatmapset) {
            sendError(res, 404, 'Beatmapset not found');
            return;
        }

        const osz = await StorageService.findOsz(id);
        if (osz.status === 'missing-folder') {
            sendError(res, 404, 'Beatmapset folder not found');
            return;
        }
        if (osz.status === 'missing-osz') {
            sendError(res, 404, 'No .osz file found');
            return;
        }

        let entries;
        try {
            entries = await OszService.listEntries(osz.filePath);
        } catch (err) {
            console.error('zip read error:', err);
            sendError(res, 500, 'Invalid or corrupted zip archive');
            return;
        }

        res.json({
            id,
            file: osz.fileName,
            entries,
        });
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
    static async getOsuFile(req: Request, res: Response): Promise<void> {
        const id = parseId(req.params.id);
        if (id === null) {
            sendError(res, 400, 'Invalid beatmap ID');
            return;
        }

        const beatmap = await BeatmapRepository.getById(id);
        if (!beatmap) {
            sendError(res, 404, 'Beatmap not found');
            return;
        }

        const osz = await StorageService.findOsz(beatmap.beatmapset_id);
        if (osz.status === 'missing-folder') {
            sendError(res, 404, 'Beatmapset folder not found');
            return;
        }
        if (osz.status === 'missing-osz') {
            sendError(res, 404, 'No .osz file found');
            return;
        }

        let osuFiles: OsuFile[];
        try {
            osuFiles = await OszService.readOsuFiles(osz.filePath);
        } catch (err) {
            console.error('zip read error:', err);
            sendError(res, 500, 'Invalid or corrupted zip archive');
            return;
        }

        let match = osuFiles.find((osuFile) => osuFile.md5 === beatmap.checksum);
        // old .osu files have no BeatmapID line
        if (!match) {
            match = osuFiles.find((osuFile) => findBeatmapId(osuFile) === id);
        }
        if (!match) {
            sendError(res, 404, '.osu file not found for this beatmap');
            return;
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(match.buffer);
    }

    private static sendWithoutVideo(filePath: string, res: Response): void {
        const archive = OszService.createArchiveWithoutVideo(filePath);
        archive.on('error', (err) => {
            console.error('Archiver error:', err);
            if (res.headersSent) {
                res.destroy(err);
                return;
            }
            sendError(res, 500, 'Failed to repack beatmapset');
        });
        archive.pipe(res);
    }
}