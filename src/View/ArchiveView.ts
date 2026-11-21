import { ArchiveRow } from '@Model/ArchiveModel';
import { toIso } from '@View/Format';

export class ArchiveView {
    static render(row: ArchiveRow) {
        const [year, month] = row.month.split('-');

        return {
            month: row.month,
            mode: row.mode,
            file_name: row.file_name,
            size_gb: row.size_gb,
            beatmapset_count: row.beatmapset_count,
            created_at: toIso(row.created_at),
            url: `/api/archive/${year}/${month}/${row.mode}`,
        };
    }

    static renderYearly(
        year: string,
        mode: string,
        fileSize: number,
        beatmapsetCount: number,
        stats: { seeds: number; leechers: number; magnet: string } | undefined,
    ) {
        let seeds: number | null = null;
        let leechers: number | null = null;
        let peers: number | null = null;
        let magnet: string | null = null;
        if (stats) {
            seeds = stats.seeds;
            leechers = stats.leechers;
            peers = stats.seeds + stats.leechers;
            magnet = stats.magnet;
        }

        return {
            year,
            mode,
            file_name: `${year}-${mode}.zip`,
            size: fileSize,
            beatmapset_count: beatmapsetCount,
            url: `/api/archive/${year}/${mode}`,
            torrent_url: `/api/archive/${year}/${mode}/torrent`,
            seeds,
            peers,
            leechers,
            magnet,
        };
    }
}

export type ArchiveJson = ReturnType<typeof ArchiveView.render>;
export type YearlyArchiveJson = ReturnType<typeof ArchiveView.renderYearly>;