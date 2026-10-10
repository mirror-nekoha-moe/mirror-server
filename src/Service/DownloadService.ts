import { StatsRepository } from '@Repository/StatsRepository';

export class DownloadService {
    static recordDownload(bytes: number): void {
        StatsRepository.recordDownload(bytes)
            .catch((err) => console.error('Failed to update download_stats:', err));
    }
}