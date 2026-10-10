import fsp from 'fs/promises';
import path from 'path';
import { Environment } from '@Bootstrap/Environment';
import { DbNumber } from '@Model/BeatmapsetModel';

export type OszLookup =
    | { status: 'missing-folder' }
    | { status: 'missing-osz' }
    | { status: 'found'; filePath: string; fileName: string; size: number };

// cifs mount, keep it async
export class StorageService {
    static async findOsz(beatmapsetId: DbNumber): Promise<OszLookup> {
        const folder = path.join(Environment.env.STORAGE_DIR, String(beatmapsetId));

        const folderStat = await fsp.lstat(folder).catch(() => null);
        if (!folderStat || !folderStat.isDirectory()) {
            return { status: 'missing-folder' };
        }

        // some sets have several .osz, take the largest
        const files = await fsp.readdir(folder);
        let largestName: string | null = null;
        let largestSize = -1;
        for (const file of files) {
            if (!file.endsWith('.osz')) {
                continue;
            }
            const fileStat = await fsp.stat(path.join(folder, file));
            if (fileStat.size > largestSize) {
                largestName = file;
                largestSize = fileStat.size;
            }
        }

        if (largestName === null) {
            return { status: 'missing-osz' };
        }

        return {
            status: 'found',
            filePath: path.join(folder, largestName),
            fileName: largestName,
            size: largestSize,
        };
    }
}