import { Request, Response, RequestHandler } from 'express';

export type Handler = (req: Request, res: Response) => Promise<void>;

// express 4 doesn't catch async errors
export function handle(handler: Handler, errorMessage: string): RequestHandler {
    return async (req, res) => {
        try {
            await handler(req, res);
        } catch (err) {
            console.error(`${errorMessage}:`, err);
            if (res.headersSent) {
                res.destroy();
                return;
            }
            res.status(500).json({ error: errorMessage });
        }
    };
}

export function sendError(res: Response, status: number, message: string): void {
    res.status(status).json({ error: message });
}

export function parseId(value: string): number | null {
    const id = parseInt(value, 10);
    if (isNaN(id) || id < 0) {
        return null;
    }
    return id;
}

export function readQueryString(value: unknown): string | undefined {
    if (value === undefined) {
        return undefined;
    }
    return String(value);
}

export interface ByteRange {
    start: number;
    end: number;
}

// no suffix or multipart ranges
export function parseRange(header: string | undefined, size: number): ByteRange | null {
    if (!header) {
        return null;
    }
    const match = header.match(/^bytes=(\d+)-(\d*)$/);
    if (!match) {
        return null;
    }

    const start = parseInt(match[1], 10);
    let end = size - 1;
    if (match[2] !== '') {
        end = parseInt(match[2], 10);
    }
    if (end > size - 1) {
        end = size - 1;
    }
    return { start, end };
}