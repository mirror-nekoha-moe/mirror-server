import { Request, Response } from 'express';
import { StatsService } from '@Service/StatsService';

const DEFAULT_DOWNLOAD_DAYS = 30;
const MAX_DOWNLOAD_DAYS = 365;

export class StatsController {
    /**
     * @api {get} /api/stats Get beatmap mirror statistics
     * @apiName stats
     * @apiGroup Stats
     * @apiDescription Returns stats table row.
     * @apiSuccess {Number} beatmapset_count Total number of beatmapsets stored
     * @apiSuccess {Number} beatmap_count Total number of individual beatmaps
     * @apiSuccess {Number} total_size Total storage size in bytes
     * @apiError 404 No stats found
     * @apiError 500 Internal server error
     * @apiExample {curl} Example usage:
     *     curl https://mirror.nekoha.moe/api/stats
     */
    static async getStats(req: Request, res: Response): Promise<void> {
        const stats = await StatsService.getStats();
        res.json(stats);
    }

    /**
     * @api {get} /api/download-stats Get daily download statistics
     * @apiName download-stats
     * @apiGroup Stats
     * @apiQuery {Number} [days=30] Number of past days to return
     * @apiSuccess {Array} rows Array of { day, downloads, bytes_sent }
     */
    static async getDownloadStats(req: Request, res: Response): Promise<void> {
        let days = parseInt(String(req.query.days), 10);
        if (!days) {
            days = DEFAULT_DOWNLOAD_DAYS;
        }
        if (days > MAX_DOWNLOAD_DAYS) {
            days = MAX_DOWNLOAD_DAYS;
        }

        const rows = await StatsService.getDownloadStats(days);
        res.json(rows);
    }

    /**
     * @api {get} /api/api-call-stats Get osu! API call statistics (last 6 hours, per minute)
     * @apiName api-call-stats
     * @apiGroup Stats
     * @apiSuccess {Array} v1 Array of { minute, calls } for API v1
     * @apiSuccess {Array} v2 Array of { minute, calls } for API v2
     */
    static async getApiCallStats(req: Request, res: Response): Promise<void> {
        const payload = await StatsService.getApiCallStats();
        res.json(payload);
    }
}