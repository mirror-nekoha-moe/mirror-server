import crypto from 'crypto';
import yauzl, { Entry, ZipFile } from 'yauzl';
import { ZipArchive } from 'archiver';

const VIDEO_EXTENSIONS = /\.(avi|flv|mp4|mov|wmv|m4v|mkv)$/i;

export interface OszEntry {
    name: string;
    directory: boolean;
    compressedSizeBytes: number;
    uncompressedSizeBytes: number;
    crc32: number;
    version: number;
}

export interface OsuFile {
    name: string;
    md5: string;
    buffer: Buffer;
}

function isDirectory(entry: Entry): boolean {
    return entry.fileName.endsWith('/');
}

export class OszService {
    static async listEntries(filePath: string): Promise<OszEntry[]> {
        const zipfile = await OszService.open(filePath);
        const entries: OszEntry[] = [];

        await OszService.walk(zipfile, async (entry) => {
            entries.push({
                name: entry.fileName,
                directory: isDirectory(entry),
                compressedSizeBytes: entry.compressedSize,
                uncompressedSizeBytes: entry.uncompressedSize,
                crc32: entry.crc32,
                version: entry.versionNeededToExtract,
            });
        });

        return entries;
    }

    static async readOsuFiles(filePath: string): Promise<OsuFile[]> {
        const zipfile = await OszService.open(filePath);
        const osuFiles: OsuFile[] = [];

        await OszService.walk(zipfile, async (entry) => {
            if (isDirectory(entry) || !entry.fileName.endsWith('.osu')) {
                return;
            }
            const buffer = await OszService.readEntry(zipfile, entry);
            if (buffer === null) {
                return;
            }
            const md5 = crypto.createHash('md5').update(buffer).digest('hex');
            osuFiles.push({ name: entry.fileName, md5, buffer });
        });

        return osuFiles;
    }

    // failures show up as archive 'error' events
    static createArchiveWithoutVideo(filePath: string): ZipArchive {
        // store = no recompression
        const archive = new ZipArchive({ store: true });

        OszService.open(filePath)
            .then((zipfile) => {
                return OszService.walk(zipfile, (entry) => OszService.appendEntry(archive, zipfile, entry));
            })
            .then(() => archive.finalize())
            .catch((err) => archive.destroy(err));

        return archive;
    }

    private static open(filePath: string): Promise<ZipFile> {
        return new Promise((resolve, reject) => {
            yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
                if (err || !zipfile) {
                    reject(err ?? new Error('Failed to open zip'));
                    return;
                }
                resolve(zipfile);
            });
        });
    }

    // with lazyEntries nothing is read until readEntry()
    private static walk(zipfile: ZipFile, onEntry: (entry: Entry) => Promise<void>): Promise<void> {
        return new Promise((resolve, reject) => {
            zipfile.on('entry', (entry: Entry) => {
                onEntry(entry)
                    .then(() => zipfile.readEntry())
                    .catch(reject);
            });
            zipfile.on('end', () => resolve());
            zipfile.on('error', reject);
            zipfile.readEntry();
        });
    }

    private static readEntry(zipfile: ZipFile, entry: Entry): Promise<Buffer | null> {
        return new Promise((resolve) => {
            zipfile.openReadStream(entry, (err, stream) => {
                if (err || !stream) {
                    resolve(null);
                    return;
                }
                const chunks: Buffer[] = [];
                stream.on('data', (chunk: Buffer) => chunks.push(chunk));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', () => resolve(null));
            });
        });
    }

    private static appendEntry(archive: ZipArchive, zipfile: ZipFile, entry: Entry): Promise<void> {
        if (VIDEO_EXTENSIONS.test(entry.fileName)) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            zipfile.openReadStream(entry, (err, stream) => {
                if (err || !stream) {
                    resolve();
                    return;
                }
                archive.append(stream, { name: entry.fileName });
                // wait for archiver to drain it before the next entry
                stream.on('end', () => resolve());
            });
        });
    }
}