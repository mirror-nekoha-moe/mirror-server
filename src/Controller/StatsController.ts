import { Request, Response } from 'express';
import { StatsService } from '@Service/StatsService';
import { RequestStatsService } from '@Service/RequestStatsService';

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

function parseDays(value: unknown): number {
    let days = parseInt(String(value), 10);
    if (!days) {
        days = DEFAULT_DAYS;
    }
    if (days > MAX_DAYS) {
        days = MAX_DAYS;
    }
    return days;
}

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
        const days = parseDays(req.query.days);
        const rows = await StatsService.getDownloadStats(days);
        res.json(rows);
    }

    /**
     * @api {get} /api/api-request-stats Get daily API request statistics
     * @apiName api-request-stats
     * @apiGroup Stats
     * @apiDescription Requests served by this API per day, downloads not included (see /api/download-stats).
     * @apiQuery {Number} [days=30] Number of past days to return
     * @apiSuccess {Array} rows Array of { day, requests }
     */
    static async getApiRequestStats(req: Request, res: Response): Promise<void> {
        const days = parseDays(req.query.days);
        const rows = await StatsService.getApiRequestStats(days);
        res.json(rows);
    }

    /**
     * @api {get} /api/api-requests-per-second Get live API requests per second
     * @apiName api-requests-per-second
     * @apiGroup Stats
     * @apiDescription Average API requests per second over the last 10 minutes, downloads not included.
     * @apiSuccess {Number} requests_per_second Average requests per second
     */
    static async getRequestsPerSecond(req: Request, res: Response): Promise<void> {
        const requestsPerSecond = await RequestStatsService.getRequestsPerSecond();
        res.json({ requests_per_second: requestsPerSecond });
    }

    /**
     * @api {get} /api/data-served Get all time data served
     * @apiName data-served
     * @apiGroup Stats
     * @apiDescription Total bytes sent to clients since tracking started, downloads and API responses.
     * @apiSuccess {Number} download_bytes Bytes sent by beatmapset downloads
     * @apiSuccess {Number} api_bytes Bytes sent by all other API responses
     * @apiSuccess {Number} total_bytes download_bytes + api_bytes
     */
    static async getDataServed(req: Request, res: Response): Promise<void> {
        const payload = await StatsService.getDataServed();
        res.json(payload);
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