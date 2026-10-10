import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Environment } from '@Bootstrap/Environment';
import { registerRoutes } from '@Route/Routes';
import { RequestStatsService } from '@Service/RequestStatsService';

function responseSize(res: Response): number {
    const size = Number(res.getHeader('content-length'));
    if (isNaN(size)) {
        return 0;
    }
    return size;
}

// downloads are already counted in download_stats
function countApiRequest(req: Request, res: Response, next: NextFunction): void {
    const isApi = req.path.startsWith('/api/');
    const isDownload = req.path.startsWith('/api/download/');
    if (isApi && !isDownload) {
        res.on('close', () => RequestStatsService.count(responseSize(res)));
    }
    next();
}

export class HttpServer {
    static start(): void {
        const app = express();

        app.use(cors());
        app.use(express.json());
        app.use(countApiRequest);

        registerRoutes(app);
        RequestStatsService.start();

        app.listen(Environment.env.PORT, () => {
            console.log(`Mirror API server listening on port ${Environment.env.PORT} with PID=${process.pid}`);
        });
    }
}