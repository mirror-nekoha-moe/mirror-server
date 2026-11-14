import { Cache } from '@Core/Cache/Cache';
import { Environment } from '@Bootstrap/Environment';
import { ArchiveRepository } from '@Repository/ArchiveRepository';
import { ArchiveRow } from '@Model/ArchiveModel';
import { ArchiveView, ArchiveJson } from '@View/ArchiveView';

export class ArchiveService {
    static async getArchives(): Promise<ArchiveJson[]> {
        const cacheKey = 'archives';
        const cached = await Cache.getJson<ArchiveJson[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const rows = await ArchiveRepository.getAll();
        const archives = [];
        for (const row of rows) {
            archives.push(ArchiveView.render(row));
        }

        await Cache.setJson(cacheKey, archives, Environment.env.REDIS_CACHE_TIME_SHORT);
        return archives;
    }

    static async getArchive(month: string, mode: string): Promise<ArchiveRow | null> {
        return ArchiveRepository.getByMonth(month, mode);
    }
}