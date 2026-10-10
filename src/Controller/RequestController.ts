import { Request, Response } from 'express';
import { sendError } from '@Core/Http/Http';
import { RequestRepository } from '@Repository/RequestRepository';
import { WebhookService } from '@Service/WebhookService';
import { RequestItemInput } from '@Model/RequestModel';

const MAX_ITEMS_PER_REQUEST = 100;

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
        return isHttp && url.hostname !== '';
    } catch {
        return false;
    }
}

function isValidType(value: unknown): boolean {
    return value === 'new' || value === 'update';
}

function isValidBeatmapsetId(value: unknown): boolean {
    if (value === undefined || value === null || value === '') {
        return false;
    }
    const id = Number(value);
    return Number.isInteger(id) && id >= 0;
}

function validateItem(item: any): string | null {
    if (!isNonEmptyString(item.type) || !isValidType(item.type)) {
        return 'invalid type';
    }
    if (!isValidBeatmapsetId(item.beatmapsetId)) {
        return 'beatmapsetId must be a valid integer';
    }
    if (!isNonEmptyString(item.beatmapsetUrl) || !isHttpUrl(item.beatmapsetUrl)) {
        return 'invalid beatmapsetUrl';
    }
    if (!isNonEmptyString(item.oszUrl) || !isHttpUrl(item.oszUrl)) {
        return 'invalid oszUrl';
    }
    if (item.notes != null && typeof item.notes !== 'string') {
        return 'notes must be a string';
    }
    return null;
}

export class RequestController {
    /**
     * @api {post} /api/request Create beatmap request batch
     * @apiName createRequest
     * @apiGroup Request
     */
    static async createRequest(req: Request, res: Response): Promise<void> {
        const items = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            sendError(res, 400, 'Invalid request payload');
            return;
        }
        if (items.length > MAX_ITEMS_PER_REQUEST) {
            sendError(res, 400, `You can request a maximum of ${MAX_ITEMS_PER_REQUEST} maps at once`);
            return;
        }

        for (const item of items) {
            const problem = validateItem(item);
            if (problem !== null) {
                sendError(res, 400, problem);
                return;
            }
        }

        const batchId = await RequestRepository.createBatch(items as RequestItemInput[]);

        // non-blocking
        WebhookService.sendRequestCreated(batchId).catch(console.error);

        res.json({
            requestId: batchId,
            status: 'pending',
        });
    }

    /**
     * @api {get} /api/request/:id Get full request details
     * @apiName getRequest
     * @apiGroup Request
     * @apiParam {Number} id request ID,
     */
    static async getRequest(req: Request, res: Response): Promise<void> {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            sendError(res, 400, 'Invalid request id');
            return;
        }

        const batch = await RequestRepository.getBatch(id);
        if (!batch) {
            sendError(res, 404, 'Request not found');
            return;
        }
        const items = await RequestRepository.getItems(id);

        res.json({
            id: batch.id,
            status: batch.status,
            created_at: batch.created_at,
            items,
        });
    }

    /**
     * @api {get} /api/request List all beatmap requests
     * @apiName listRequests
     * @apiGroup Request
     */
    static async listRequests(req: Request, res: Response): Promise<void> {
        const batches = await RequestRepository.listBatches();
        res.json(batches);
    }
}