import { Express } from 'express';
import { handle } from '@Core/Http/Http';
import { BeatmapController } from '@Controller/BeatmapController';
import { BeatmapsetController } from '@Controller/BeatmapsetController';
import { FileController } from '@Controller/FileController';
import { StatsController } from '@Controller/StatsController';
import { RequestController } from '@Controller/RequestController';

export function registerRoutes(app: Express): void {
    // Metadata
    app.get('/api/beatmap/:id', handle(BeatmapController.getBeatmap, 'Failed to fetch beatmap'));
    app.get('/api/beatmapset/:id', handle(BeatmapsetController.getBeatmapset, 'Failed to fetch beatmapset'));
    app.get('/api/search', handle(BeatmapsetController.search, 'Failed to search beatmapsets'));
    app.get('/api/osz/:id', handle(BeatmapsetController.getOszSize, 'Failed to fetch beatmapset'));
    app.get('/api/oszFull', handle(BeatmapsetController.getAllOszSizes, 'Failed to fetch beatmapset'));

    // Files
    app.get('/api/download/:id', handle(FileController.download, 'Failed to download beatmapset'));
    app.get('/api/osz/:id/content', handle(FileController.getOszContent, 'Internal server error'));
    app.get('/api/osu/:id', handle(FileController.getOsuFile, 'Internal server error'));

    // Stats
    app.get('/api/stats', handle(StatsController.getStats, 'Failed to fetch stats'));
    app.get('/api/download-stats', handle(StatsController.getDownloadStats, 'Failed to fetch download stats'));
    app.get('/api/api-call-stats', handle(StatsController.getApiCallStats, 'Failed to fetch API call stats'));

    // Requests
    app.get('/api/request', handle(RequestController.listRequests, 'Failed to fetch requests'));
    app.post('/api/request', handle(RequestController.createRequest, 'Failed to create request'));
    app.get('/api/request/:id', handle(RequestController.getRequest, 'Failed to fetch request'));
}