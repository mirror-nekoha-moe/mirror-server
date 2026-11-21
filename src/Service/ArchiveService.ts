import fsp from 'fs/promises';
import path from 'path';
import { Cache } from '@Core/Cache/Cache';
import { Environment } from '@Bootstrap/Environment';
import { ArchiveRepository } from '@Repository/ArchiveRepository';
import { QbitService } from '@Service/QbitService';
import { ArchiveRow } from '@Model/ArchiveModel';
import { ArchiveView, ArchiveJson, YearlyArchiveJson } from '@View/ArchiveView';

export const ARCHIVE_MODES = ['std', 'taiko', 'catch', 'mania'];

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

    static async getYearlyArchives(): Promise<YearlyArchiveJson[]> {
        const cacheKey = 'yearly-archives';
        const cached = await Cache.getJson<YearlyArchiveJson[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const counts = new Map<string, number>();
        const rows = await ArchiveRepository.getAll();
        for (const row of rows) {
            const year = row.month.slice(0, 4);
            const name = `${year}-${row.mode}`;
            const count = counts.get(name) ?? 0;
            counts.set(name, count + row.beatmapset_count);
        }

        const torrentStats = await QbitService.getTorrentStats().catch((err) => {
            console.error('Failed to fetch torrent stats:', err);
            return null;
        });

        const years = await fsp.readdir(Environment.env.ARCHIVE_DIR);
        years.sort();
        years.reverse();

        const archives = [];
        for (const year of years) {
            for (const mode of ARCHIVE_MODES) {
                const name = `${year}-${mode}`;
                const zipPath = path.join(Environment.env.ARCHIVE_DIR, year, `${name}.zip`);
                const torrentPath = path.join(Environment.env.ARCHIVE_DIR, year, `${name}.torrent`);

                const zipStat = await fsp.stat(zipPath).catch(() => null);
                const torrentStat = await fsp.stat(torrentPath).catch(() => null);
                if (!zipStat || !torrentStat) {
                    continue;
                }

                const count = counts.get(name) ?? 0;
                const stats = torrentStats?.get(`${name}.zip`);
                archives.push(ArchiveView.renderYearly(year, mode, zipStat.size, count, stats));
            }
        }

        await Cache.setJson(cacheKey, archives, Environment.env.REDIS_CACHE_TIME_SHORT);
        return archives;
    }
}